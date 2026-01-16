// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleSwap
 * @notice Basit swap kontratı - test amaçlı (constant product formula)
 * @dev Deprecated - Production için StableSwapPool kullanın
 * Pausable ve ReentrancyGuard ile güvenli
 */
contract SimpleSwap is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token0;
    IERC20 public immutable token1;

    uint256 public reserve0;
    uint256 public reserve1;

    uint256 public constant FEE_BPS = 30; // 0.3% fee
    uint256 public constant BPS = 10000;

    event Swap(address indexed user, bool zeroForOne, uint256 amountIn, uint256 amountOut);
    event AddLiquidity(address indexed provider, uint256 amount0, uint256 amount1);
    event RemoveLiquidity(address indexed provider, uint256 amount0, uint256 amount1);

    constructor(address _token0, address _token1) Ownable(msg.sender) {
        require(_token0 != address(0), "SimpleSwap: token0 zero address");
        require(_token1 != address(0), "SimpleSwap: token1 zero address");
        require(_token0 != _token1, "SimpleSwap: identical tokens");
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }

    /**
     * @notice Emergency pause (sadece owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause (sadece owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external whenNotPaused nonReentrant {
        require(amount0 > 0 || amount1 > 0, "SimpleSwap: zero amounts");

        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);

        reserve0 += amount0;
        reserve1 += amount1;

        emit AddLiquidity(msg.sender, amount0, amount1);
    }

    function removeLiquidity(uint256 amount0, uint256 amount1) external whenNotPaused nonReentrant {
        require(reserve0 >= amount0 && reserve1 >= amount1, "SimpleSwap: Insufficient liquidity");

        reserve0 -= amount0;
        reserve1 -= amount1;

        token0.safeTransfer(msg.sender, amount0);
        token1.safeTransfer(msg.sender, amount1);

        emit RemoveLiquidity(msg.sender, amount0, amount1);
    }

    function swap(bool zeroForOne, uint256 amountIn) external whenNotPaused nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "SimpleSwap: zero input");

        if (zeroForOne) {
            token0.safeTransferFrom(msg.sender, address(this), amountIn);

            uint256 amountInWithFee = amountIn * (BPS - FEE_BPS);
            amountOut = (amountInWithFee * reserve1) / (reserve0 * BPS + amountInWithFee);

            require(amountOut > 0, "Insufficient output");
            require(reserve1 >= amountOut, "Insufficient liquidity");

            reserve0 += amountIn;
            reserve1 -= amountOut;

            token1.safeTransfer(msg.sender, amountOut);
        } else {
            token1.safeTransferFrom(msg.sender, address(this), amountIn);

            uint256 amountInWithFee = amountIn * (BPS - FEE_BPS);
            amountOut = (amountInWithFee * reserve0) / (reserve1 * BPS + amountInWithFee);

            require(amountOut > 0, "Insufficient output");
            require(reserve0 >= amountOut, "Insufficient liquidity");

            reserve1 += amountIn;
            reserve0 -= amountOut;

            token0.safeTransfer(msg.sender, amountOut);
        }

        emit Swap(msg.sender, zeroForOne, amountIn, amountOut);
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }
}
