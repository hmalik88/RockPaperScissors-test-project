//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

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

  // fDai address: 0x15F0Ca26781C3852f8166eD2ebce5D18265cceb7
  // deployment script should use hardcoded fDai address for rinkeby
  // otherwise deploy mock coin first and then pass in the deployed address

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

  function enroll() public returns (bool) {
    require(token.allowance(msg.sender, address(this)) >= 1, "Not enough allowance to enroll.");
    token.transferFrom(msg.sender, address(this), 1);
    balances[msg.sender] += 1;
    return true;
  }

  function submitMove(string memory _move, address _opponent, bool _shouldRollover) public fundCheck validMove(_move) returns (bool) {
    require(
      opponents[_opponent] == address(0) || 
      opponents[_opponent] == msg.sender, 
      "Your opponent is already in a game"
      );
    require(stringsEqual(moves[msg.sender], ""), "You're already in a game!.");
    moves[msg.sender] = _move;
    moveTimes[msg.sender] = block.timestamp;
    opponents[msg.sender] = _opponent;
    rollOverState[msg.sender] = _shouldRollover;
    return true;
  }

  function submitMove(string memory _move, bool _shouldRollover) public fundCheck validMove(_move) returns (bool) {
    require(alice == address(0) || bob == address(0), "The room is currently full");
    require(alice != msg.sender && bob != msg.sender, "You're already in a game!");
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
    return true;
  }

  function finishGame() public returns (bool) {
    require(alice == msg.sender || bob == msg.sender);
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
    return true;
  }

  function finishGameWithOpponent() public returns (bool) {
    require(opponents[msg.sender] != address(0));
    address _alice = msg.sender;
    address _bob = opponents[msg.sender];
    require(moveTimes[_alice] > 0 && moveTimes[_bob] > 0, "Both players must make a choice before computing winner");
    computeWinner(_alice, _bob, moves[_alice], moves[_bob]);
    opponents[_alice] = address(0);
    opponents[_bob] = address(0);
    moves[_alice] = "";
    moves[_bob] = "";
    moveTimes[_alice] = 0;
    moveTimes[_bob] = 0;
    rollOverState[_alice] = false;
    rollOverState[_bob] = false;
    return true;
  }

  function computeWinner(address _alice, address _bob, string memory _aliceChoice, string memory _bobChoice) internal {
    if (moveResults[_aliceChoice][_bobChoice] == 0) {
      if (!rollOverState[_alice]) {
        balances[_alice] -= 1;
        token.transfer(_alice, 1);
      }
      if (!rollOverState[_bob]) {
        balances[_bob] -= 1;
        token.transfer(_bob, 1);
      }
    } else if (moveResults[_aliceChoice][_bobChoice] == 1) {
      if (!rollOverState[_alice]) {
        balances[_alice] -= 1;
        token.transfer(_alice, 2);
      } else {
        balances[_alice] += 1;
      }
      balances[_bob] -= 1;
    } else {
      if (!rollOverState[_bob]) {
        balances[_bob] -= 1;
        token.transfer(_bob, 2);
      } else {
        balances[_bob] += 1;
      }
      balances[_alice] -=1;
    }
  }

  function unlockFunds() public {
    require(alice == msg.sender || bob == msg.sender, "You're currently not in a game...");
    require(stringsEqual(aliceChoice, "") || stringsEqual(bobChoice, ""), "You can't revert a completed game!");
    uint minTime = aliceTime < bobTime ? aliceTime : bobTime;
    require(minTime + 3 days < block.timestamp, "Must wait atleast 3 days before unlocking.");
    token.transfer(alice, 1);
    token.transfer(bob, 1);
    balances[alice] -= 1;
    balances[bob] -= 1;
    aliceTime = 0;
    bobTime = 0;
    alice = address(0);
    bob = address(0);
    aliceChoice = "";
    bobChoice = "";
    rollOverState[alice] = false;
    rollOverState[bob] = false;
  }

  function unlockFundsWithOpponent() public {
    require(opponents[msg.sender] != address(0), "You're currently not in a game...");
    address opponent = opponents[msg.sender];
    require(stringsEqual(moves[msg.sender], "") || stringsEqual(moves[opponent], ""), "You can't revert a completed game!");
    uint minTime = moveTimes[msg.sender] < moveTimes[opponent] ? moveTimes[msg.sender] : moveTimes[opponent];
    require(minTime + 3 days < block.timestamp, "Must wait atleast 3 days before unlocking.");
    token.transfer(msg.sender, 1);
    token.transfer(opponent, 1);
    balances[msg.sender] -= 1;
    balances[opponent] -= 1;
    moveTimes[msg.sender] = 0;
    moveTimes[opponent] = 0;
    opponents[msg.sender] = address(0);
    opponents[opponent] = address(0);
    moves[msg.sender] = "";
    moves[opponent] = "";
    rollOverState[msg.sender] = false;
    rollOverState[opponent] = false;
  }

  function stringsEqual(string memory _a, string memory _b) internal pure returns (bool) {
      return (keccak256(abi.encodePacked((_a))) == keccak256(abi.encodePacked((_b))));
  }

}
