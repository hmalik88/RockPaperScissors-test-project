//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract RockPaperScissors {

  IERC20 token;
  mapping (address => uint) private balances;
  mapping (address => string) private moves;
  mapping (address => address) private opponents;


  // fDai address: 0x15F0Ca26781C3852f8166eD2ebce5D18265cceb7
  // deployment script should use hardcoded fDai address for rinkeby
  // otherwise deploy mock coin first and then pass in the deployed address

  constructor(address _tokenAddress) {
    token = IERC20(_tokenAddress);
  }

  function enroll() public returns (bool) {
    require(token.allowance(msg.sender, address(this)) >= 1, "Not enough allowance to enroll.");
    token.transferFrom(msg.sender, address(this), 1);
    balances[msg.sender] += 1;
    return true;
  }

  function submitMove(string memory _move, address _opponent) public returns (bool) {
    require(balances[msg.sender] >= 1, "You don't have any funds to use!");
    require(opponents[_opponent] == address(0) || opponents[_opponent] == msg.sender, "Your opponent is already in a game");
    require(stringsEqual(moves[msg.sender], ""), "You must finish your current game before starting a new one.");
    require(stringsEqual(_move, "Rock") || stringsEqual(_move, "Scissors") || stringsEqual(_move, "Paper"));
    moves[msg.sender] = _move;
    return true;
  }

  function submitMove(string memory _move) public returns (bool) {

  }

    /**
  * @dev Internal function to compare strings
  *
  * */
  function stringsEqual(string memory _a, string memory _b) internal pure returns (bool) {
      return (keccak256(abi.encodePacked((_a))) == keccak256(abi.encodePacked((_b))));
  }



  // HAVE A METHOD TO REVEAL WINNER AND TRANSFER BALANCES OF BOTH PLAYERS

  // HAVE A METHOD TO RETRIEVE YOUR FUNDS BACK IF THE PERSON HAS NOT SUBMITTED THEIR MOVE
  // WANT TO CHECK THE DURATION (WE WOULD GIVE THE PERSON 3 DAYS TO SUBMIT A MOVE)


}
