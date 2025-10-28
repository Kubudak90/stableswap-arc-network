// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IStableSwapPool {
    function addLiquidity(uint256 amount0, uint256 amount1, uint256 minLpOut) external returns (uint256);
    function removeLiquidity(uint256 lpAmount, uint256 min0, uint256 min1) external returns (uint256, uint256);
    function swap(bool zeroForOne, uint256 amountIn, uint256 minAmountOut) external returns (uint256);
    function lp() external view returns (address);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

contract Router {
    using SafeERC20 for IERC20;

    function addLiquidity(
        address pool,
        uint256 amount0,
        uint256 amount1,
        uint256 minLpOut
    ) external returns (uint256 lpOut) {
        IStableSwapPool P = IStableSwapPool(pool);
        IERC20(P.token0()).safeIncreaseAllowance(pool, amount0);
        IERC20(P.token1()).safeIncreaseAllowance(pool, amount1);
        lpOut = P.addLiquidity(amount0, amount1, minLpOut);
    }

    function removeLiquidity(
        address pool,
        uint256 lpAmount,
        uint256 min0,
        uint256 min1
    ) external returns (uint256 amt0, uint256 amt1) {
        IStableSwapPool P = IStableSwapPool(pool);
        address lp = P.lp();
        IERC20(lp).safeIncreaseAllowance(pool, lpAmount);
        (amt0, amt1) = P.removeLiquidity(lpAmount, min0, min1);
    }

    function swapExactTokensForTokens(
        address pool,
        bool zeroForOne,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut) {
        IStableSwapPool P = IStableSwapPool(pool);
        address inToken = zeroForOne ? P.token0() : P.token1();
        IERC20(inToken).safeIncreaseAllowance(pool, amountIn);
        amountOut = P.swap(zeroForOne, amountIn, minAmountOut);
    }
}
