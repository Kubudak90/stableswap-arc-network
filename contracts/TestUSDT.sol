// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestUSDT is ERC20 {
    constructor() ERC20("Test USDT", "tUSDT") {
        _mint(msg.sender, 1000000 * 10**6); // 1M tokens with 6 decimals
    }
}
