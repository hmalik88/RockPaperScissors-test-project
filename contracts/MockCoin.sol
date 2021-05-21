//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockCoin is ERC20 {
    string private TOKEN_NAME = "Mock Token";
    string private TOKEN_SYMBOL = "MCK";


    constructor() ERC20(TOKEN_NAME, TOKEN_SYMBOL) {

    }

    function mint(uint _amount) public returns (bool) {
        _mint(msg.sender, _amount);
        return true;
    }
}