// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SimpleSwap
 * @notice Basit swap kontratı - test amaçlı
 */
contract SimpleSwap {
    using SafeERC20 for IERC20;

    IERC20 public immutable token0;
    IERC20 public immutable token1;
    
    uint256 public reserve0;
    uint256 public reserve1;
    
    uint256 public constant FEE_BPS = 30; // 0.3% fee
    uint256 public constant BPS = 10000;

    event Swap(address indexed user, bool zeroForOne, uint256 amountIn, uint256 amountOut);

    constructor(address _token0, address _token1) {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external {
        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);
        
        reserve0 += amount0;
        reserve1 += amount1;
    }

    function swap(bool zeroForOne, uint256 amountIn) external returns (uint256 amountOut) {
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
