//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RockPaperScissors {

  IERC20 private token;
  mapping(address => uint) private balances;
  mapping(address => string) private moves;
  mapping(address => address) private opponents;
  mapping(address => uint) private moveTimes;
  mapping(string => mapping(string => uint)) private moveResults;
  mapping(address => bool) private rollOverState;
  address private alice;
  address private bob;
  string private aliceChoice;
  string private bobChoice;
  uint private aliceTime;
  uint private bobTime;


  constructor(address _tokenAddress) {
    token = IERC20(_tokenAddress);
    moveResults["R"]["R"] = 0;
    moveResults["R"]["S"] = 1;
    moveResults["R"]["P"] = 2;
    moveResults["P"]["R"] = 1;
    moveResults["P"]["P"] = 0;
    moveResults["P"]["S"] = 2;
    moveResults["S"]["R"] = 2;
    moveResults["S"]["S"] = 0;
    moveResults["S"]["P"] = 1;
  }

  modifier fundCheck() {
    require(balances[msg.sender] >= 1, "You don't have any funds to use!");
    _;
  }

  modifier validMove(string memory _move) {
    require(
      stringsEqual(_move, "R") || 
      stringsEqual(_move, "S") || 
      stringsEqual(_move, "P"), 
      "Move must be R (Rock), P (Paper) or S (Scissors)."
      );
    _;
  }

  function enroll() public {
    require(token.allowance(msg.sender, address(this)) >= 1, "Not enough allowance to enroll.");
    token.transferFrom(msg.sender, address(this), 1);
    balances[msg.sender] += 1;
  }

  function submitMoveWithOpponent(
    string memory _move, 
    bool _shouldRollover, 
    address _opponent
  ) 
    public 
    fundCheck 
    validMove(_move) 
  {
    require(
      opponents[_opponent] == address(0) || 
      opponents[_opponent] == msg.sender, 
      "Your opponent is already in a game"
    );
    require(
      moveTimes[msg.sender] == 0 &&
      alice != msg.sender && 
      bob != msg.sender, 
      "You're already in a game!"
    );
    moves[msg.sender] = _move;
    moveTimes[msg.sender] = block.timestamp;
    opponents[msg.sender] = _opponent;
    rollOverState[msg.sender] = _shouldRollover;
  }

  function submitMove(string memory _move, bool _shouldRollover) public fundCheck validMove(_move) {
    require(alice == address(0) || bob == address(0), "The room is currently full");
    require(
      alice != msg.sender && 
      bob != msg.sender &&
      opponents[msg.sender] == address(0), 
      "You're already in a game!"
    );
    if (alice == address(0)) {
      alice = msg.sender;
      aliceChoice = _move;
      aliceTime = block.timestamp;
    } else {
      bob = msg.sender;
      bobChoice = _move;
      bobTime = block.timestamp;
    }
    rollOverState[msg.sender] = _shouldRollover;
  }

  function finishGame() public {
    require(alice == msg.sender || bob == msg.sender, "You are not a participant.");
    require(aliceTime > 0 && bobTime > 0, "Both players must make a choice before computing winner");
    computeWinner(alice, bob, aliceChoice, bobChoice);
    alice = address(0);
    bob = address(0);
    aliceChoice = "";
    bobChoice = "";
    aliceTime = 0;
    bobTime = 0;
    rollOverState[alice] = false;
    rollOverState[bob] = false;
  }

  function finishGameWithOpponent() public {
    require(opponents[msg.sender] != address(0), "You are not a participant.");
    address _alice = msg.sender;
    address _bob = opponents[msg.sender];
    require(
      moveTimes[_alice] > 0 && moveTimes[_bob] > 0, 
      "Both players must make a choice before computing winner"
    );
    computeWinner(_alice, _bob, moves[_alice], moves[_bob]);
    opponents[_alice] = address(0);
    opponents[_bob] = address(0);
    moves[_alice] = "";
    moves[_bob] = "";
    moveTimes[_alice] = 0;
    moveTimes[_bob] = 0;
    rollOverState[_alice] = false;
    rollOverState[_bob] = false;
  }

  function unlockFunds() public {
    require(alice == msg.sender, "You're currently not in a game...");
    require(alice == msg.sender && bob == address(0), "You can't revert a completed game!");
    require(block.timestamp >= aliceTime + 3 days, "Must wait atleast 3 days before unlocking.");
    if (!rollOverState[alice]){
      token.transfer(alice, 1);
      balances[alice] -=1;
    }
    aliceTime = 0;
    alice = address(0);
    aliceChoice = "";
    rollOverState[alice] = false;
  }

  function unlockFundsWithOpponent() public {
    require(opponents[msg.sender] != address(0), "You're currently not in a game...");
    address opponent = opponents[msg.sender];
    require(opponents[opponent] != msg.sender, "You can't revert a completed game!");
    require(
      block.timestamp >= moveTimes[msg.sender] + 3 days, 
      "Must wait atleast 3 days before unlocking."
    );
    if (!rollOverState[msg.sender]) {
      token.transfer(msg.sender, 1);
      balances[msg.sender] -= 1;
    }
    moveTimes[msg.sender] = 0;
    opponents[msg.sender] = address(0);
    moves[msg.sender] = "";
    rollOverState[msg.sender] = false;
  }

  function retrieveFromBalance(uint _amount) public {
    require(
      msg.sender != alice &&
      msg.sender != bob &&
      opponents[msg.sender] == address(0),
      "You cannot retrieve funds while in a game."
    );
    require(
      balances[msg.sender] >= _amount, 
      "You have less than the requested amount in your balance."
    );
    token.transfer(msg.sender, _amount);
    balances[msg.sender] -= _amount;
  }

  function balanceOf(address _owner) public view returns(uint) {
    return balances[_owner];
  }

  function computeWinner(
    address _alice, 
    address _bob, 
    string memory _aliceChoice, 
    string memory _bobChoice
  ) 
    internal 
  {
    if (moveResults[_aliceChoice][_bobChoice] == 0) {
      if (!rollOverState[_alice]) {
        token.transfer(_alice, 1);
        balances[_alice] -= 1;
      }
      if (!rollOverState[_bob]) {
        token.transfer(_bob, 1);
        balances[_bob] -= 1;
      }
    } else if (moveResults[_aliceChoice][_bobChoice] == 1) {
      if (!rollOverState[_alice]) {
        token.transfer(_alice, 2);
        balances[_alice] -= 1;
      } else {
        balances[_alice] += 1;
      }
      balances[_bob] -= 1;
    } else {
      if (!rollOverState[_bob]) {
        token.transfer(_bob, 2);
        balances[_bob] -= 1;
      } else {
        balances[_bob] += 1;
      }
      balances[_alice] -=1;
    }
  }

  function stringsEqual(string memory _a, string memory _b) internal pure returns (bool) {
    return (keccak256(abi.encodePacked((_a))) == keccak256(abi.encodePacked((_b))));
  }

}
