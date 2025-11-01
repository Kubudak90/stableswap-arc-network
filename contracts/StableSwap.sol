// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title StableSwap
 * @notice Basit stabilcoin swap - 1:1 oranı korur
 */
contract StableSwap {
    using SafeERC20 for IERC20;

    IERC20 public immutable token0;
    IERC20 public immutable token1;
    
    uint256 public reserve0;
    uint256 public reserve1;
    
    uint256 public constant FEE_BPS = 4; // 0.04% fee (4 bps)
    uint256 public constant BPS = 10000;

    event Swap(address indexed user, bool zeroForOne, uint256 amountIn, uint256 amountOut);
    event AddLiquidity(address indexed provider, uint256 amount0, uint256 amount1);
    event RemoveLiquidity(address indexed provider, uint256 amount0, uint256 amount1);

    constructor(address _token0, address _token1) {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external {
        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);
        
        reserve0 += amount0;
        reserve1 += amount1;
        
        emit AddLiquidity(msg.sender, amount0, amount1);
    }

    function removeLiquidity(uint256 amount0, uint256 amount1) external {
        require(reserve0 >= amount0 && reserve1 >= amount1, "Insufficient liquidity");
        
        reserve0 -= amount0;
        reserve1 -= amount1;
        
        token0.safeTransfer(msg.sender, amount0);
        token1.safeTransfer(msg.sender, amount1);
        
        emit RemoveLiquidity(msg.sender, amount0, amount1);
    }

    function swap(bool zeroForOne, uint256 amountIn) external returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid amount");
        
        if (zeroForOne) {
            // token0 -> token1
            token0.safeTransferFrom(msg.sender, address(this), amountIn);
            
            // Stabilcoin için 1:1 oran + küçük fee
            amountOut = amountIn * (BPS - FEE_BPS) / BPS;
            
            require(amountOut > 0, "Insufficient output");
            require(reserve1 >= amountOut, "Insufficient liquidity");
            
            reserve0 += amountIn;
            reserve1 -= amountOut;
            
            token1.safeTransfer(msg.sender, amountOut);
        } else {
            // token1 -> token0
            token1.safeTransferFrom(msg.sender, address(this), amountIn);
            
            // Stabilcoin için 1:1 oran + küçük fee
            amountOut = amountIn * (BPS - FEE_BPS) / BPS;
            
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

    function getAmountOut(uint256 amountIn, bool zeroForOne) external view returns (uint256) {
        if (amountIn == 0) return 0;
        
        // Stabilcoin için 1:1 oran + küçük fee
        return amountIn * (BPS - FEE_BPS) / BPS;
    }
}
