// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title LPToken
 * @author StableSwap Arc Network Team
 * @notice Liquidity Provider token representing pool share ownership
 * @dev ERC20 token with restricted mint/burn - only the pool contract can mint/burn.
 *
 * Key Features:
 * - Represents proportional ownership of pool liquidity
 * - Mint/burn restricted to pool contract only
 * - Pool address can only be set once (immutable after initialization)
 *
 * Security Considerations:
 * - onlyPool modifier ensures only the pool can mint/burn
 * - Pool address is immutable once set, preventing manipulation
 * - Inherits OpenZeppelin's ERC20 implementation
 */
contract LPToken is ERC20, Ownable {
    /// @notice Address of the pool contract (only address that can mint/burn)
    address public pool;

    /// @notice Restricts function access to pool contract only
    modifier onlyPool() {
        require(msg.sender == pool, "LP: not pool");
        _;
    }

    /**
     * @notice Initializes the LP token with given name and symbol
     * @dev Pool address must be set separately via setPool()
     * @param name_ Token name (e.g., "StableSwap LP")
     * @param symbol_ Token symbol (e.g., "sLP")
     */
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) Ownable(msg.sender) {}

    /**
     * @notice Sets the pool contract address (can only be called once)
     * @dev Only owner can call. Once set, pool address cannot be changed.
     * @param _pool Address of the pool contract
     */
    function setPool(address _pool) external onlyOwner {
        require(pool == address(0), "LP: pool set");
        pool = _pool;
    }

    /**
     * @notice Mints LP tokens to specified address
     * @dev Only callable by the pool contract when liquidity is added
     * @param to Recipient address
     * @param amount Amount of LP tokens to mint
     */
    function mint(address to, uint256 amount) external onlyPool {
        _mint(to, amount);
    }

    /**
     * @notice Burns LP tokens from specified address
     * @dev Only callable by the pool contract when liquidity is removed
     * @param from Address to burn tokens from
     * @param amount Amount of LP tokens to burn
     */
    function burn(address from, uint256 amount) external onlyPool {
        _burn(from, amount);
    }
}
