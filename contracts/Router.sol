// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IStableSwapPool
 * @notice Interface for StableSwapPool contract
 */
interface IStableSwapPool {
    function addLiquidity(uint256 amount0, uint256 amount1, uint256 minLpOut) external returns (uint256);
    function removeLiquidity(uint256 lpAmount, uint256 min0, uint256 min1) external returns (uint256, uint256);
    function swap(bool zeroForOne, uint256 amountIn, uint256 minAmountOut) external returns (uint256);
    function lp() external view returns (address);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

/**
 * @title Router
 * @author StableSwap Arc Network Team
 * @notice Helper contract for interacting with StableSwapPool
 * @dev Provides user-friendly interface for liquidity and swap operations.
 *      Handles token approvals securely using forceApprove pattern.
 *
 * Key Features:
 * - Add/remove liquidity with slippage protection
 * - Token swaps with minimum output guarantee
 * - Secure approval handling (reset to 0 after use)
 *
 * Security Considerations:
 * - Uses ReentrancyGuard to prevent reentrancy attacks
 * - Uses forceApprove to prevent approval race conditions
 * - Resets approvals to 0 after each operation
 * - All functions validate pool address is non-zero
 */
contract Router is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /**
     * @notice Adds liquidity to a StableSwapPool
     * @dev Transfers tokens from user, approves pool, adds liquidity, transfers LP tokens back
     * @param pool Address of the StableSwapPool
     * @param amount0 Amount of token0 to add
     * @param amount1 Amount of token1 to add
     * @param minLpOut Minimum LP tokens to receive (slippage protection)
     * @return lpOut Amount of LP tokens minted
     */
    function addLiquidity(
        address pool,
        uint256 amount0,
        uint256 amount1,
        uint256 minLpOut
    ) external nonReentrant returns (uint256 lpOut) {
        require(pool != address(0), "Router: zero pool address");
        IStableSwapPool P = IStableSwapPool(pool);

        // Transfer tokens from user to router first
        IERC20 t0 = IERC20(P.token0());
        IERC20 t1 = IERC20(P.token1());
        t0.safeTransferFrom(msg.sender, address(this), amount0);
        t1.safeTransferFrom(msg.sender, address(this), amount1);

        // Use forceApprove to prevent dangling allowance
        t0.forceApprove(pool, amount0);
        t1.forceApprove(pool, amount1);

        lpOut = P.addLiquidity(amount0, amount1, minLpOut);

        // Reset approvals to 0 for safety
        t0.forceApprove(pool, 0);
        t1.forceApprove(pool, 0);

        // Transfer LP tokens to user
        IERC20(P.lp()).safeTransfer(msg.sender, lpOut);
    }

    /**
     * @notice Removes liquidity from a StableSwapPool
     * @dev Burns LP tokens and returns underlying tokens to user
     * @param pool Address of the StableSwapPool
     * @param lpAmount Amount of LP tokens to burn
     * @param min0 Minimum amount of token0 to receive (slippage protection)
     * @param min1 Minimum amount of token1 to receive (slippage protection)
     * @return amt0 Amount of token0 received
     * @return amt1 Amount of token1 received
     */
    function removeLiquidity(
        address pool,
        uint256 lpAmount,
        uint256 min0,
        uint256 min1
    ) external nonReentrant returns (uint256 amt0, uint256 amt1) {
        require(pool != address(0), "Router: zero pool address");
        IStableSwapPool P = IStableSwapPool(pool);
        address lpToken = P.lp();

        // Transfer LP tokens from user
        IERC20(lpToken).safeTransferFrom(msg.sender, address(this), lpAmount);

        // Approve pool to spend LP tokens
        IERC20(lpToken).forceApprove(pool, lpAmount);

        (amt0, amt1) = P.removeLiquidity(lpAmount, min0, min1);

        // Reset approval
        IERC20(lpToken).forceApprove(pool, 0);

        // Transfer tokens to user
        IERC20(P.token0()).safeTransfer(msg.sender, amt0);
        IERC20(P.token1()).safeTransfer(msg.sender, amt1);
    }

    /**
     * @notice Swaps exact input tokens for output tokens
     * @dev Executes a swap through the StableSwapPool with slippage protection
     * @param pool Address of the StableSwapPool
     * @param zeroForOne Direction of swap (true: token0→token1, false: token1→token0)
     * @param amountIn Exact amount of input tokens to swap
     * @param minAmountOut Minimum output tokens to receive (slippage protection)
     * @return amountOut Actual amount of output tokens received
     */
    function swapExactTokensForTokens(
        address pool,
        bool zeroForOne,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        require(pool != address(0), "Router: zero pool address");
        IStableSwapPool P = IStableSwapPool(pool);
        IERC20 inToken = IERC20(zeroForOne ? P.token0() : P.token1());
        IERC20 outToken = IERC20(zeroForOne ? P.token1() : P.token0());

        // Transfer input token from user
        inToken.safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve pool
        inToken.forceApprove(pool, amountIn);

        amountOut = P.swap(zeroForOne, amountIn, minAmountOut);

        // Reset approval
        inToken.forceApprove(pool, 0);

        // Transfer output token to user
        outToken.safeTransfer(msg.sender, amountOut);
    }
}
