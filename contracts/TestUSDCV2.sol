// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract TestUSDCV2 is ERC20, Ownable {
    constructor() ERC20("Test USDC", "tUSDC") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**6); // Initial 1M tokens with 6 decimals
    }
    
    /**
     * @notice Mint new tokens - only owner
     * @param to Address to mint tokens to
     * @param amount Amount to mint (in 6 decimals)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @notice Mint tokens with 6 decimals wrapper
     */
    function mintTokens(address to, uint256 amountInTokens) external onlyOwner {
        _mint(to, amountInTokens * 10**6);
    }
}
