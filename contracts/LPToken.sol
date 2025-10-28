// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LPToken
 * @dev Simple ERC20 for representing pool shares. Mint/burn restricted to pool.
 */
contract LPToken is ERC20, Ownable {
    address public pool;

    modifier onlyPool() {
        require(msg.sender == pool, "LP: not pool");
        _;
    }

    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) Ownable(msg.sender) {}

    function setPool(address _pool) external onlyOwner {
        require(pool == address(0), "LP: pool set");
        pool = _pool;
    }

    function mint(address to, uint256 amount) external onlyPool {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyPool {
        _burn(from, amount);
    }
}
