// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MintableTestToken
 * @notice Test token with mint capability - 6 decimals (like USDC/USDT)
 */
contract MintableTestToken is ERC20, Ownable {
    uint8 private immutable _decimals;

    // Addresses that can mint
    mapping(address => bool) public minters;

    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _decimals = decimals_;
        minters[msg.sender] = true; // Owner is minter by default
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Add a minter
     */
    function addMinter(address minter) external onlyOwner {
        minters[minter] = true;
        emit MinterAdded(minter);
    }

    /**
     * @notice Remove a minter
     */
    function removeMinter(address minter) external onlyOwner {
        minters[minter] = false;
        emit MinterRemoved(minter);
    }

    /**
     * @notice Mint tokens - only minters
     */
    function mint(address to, uint256 amount) external {
        require(minters[msg.sender], "MintableTestToken: not a minter");
        _mint(to, amount);
    }

    /**
     * @notice Mint tokens with token amount (auto-applies decimals)
     */
    function mintTokens(address to, uint256 tokenAmount) external {
        require(minters[msg.sender], "MintableTestToken: not a minter");
        _mint(to, tokenAmount * (10 ** _decimals));
    }
}
