// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {FeeDistributor} from "./FeeDistributor.sol";

/**
 * @title StableSwap3Pool
 * @notice 3 token'lı stabilcoin swap - 1:1:1 oranı korur, fee distribution entegre
 */
contract StableSwap3Pool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token0; // tUSDC
    IERC20 public immutable token1; // tUSDT
    IERC20 public immutable token2; // tUSDY
    
    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public reserve2;
    
    uint256 public constant FEE_BPS = 4; // 0.04% fee (4 bps)
    uint256 public constant BPS = 10000;
    
    FeeDistributor public feeDistributor;

    event Swap(address indexed user, uint8 tokenIn, uint8 tokenOut, uint256 amountIn, uint256 amountOut);
    event AddLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 amount2);
    event RemoveLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 amount2);
    event FeeDistributorUpdated(address indexed oldDistributor, address indexed newDistributor);

    constructor(address _token0, address _token1, address _token2) Ownable(msg.sender) {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        token2 = IERC20(_token2);
    }
    
    /**
     * @notice Fee distributor'ı ayarla (sadece owner)
     * @dev KRİTİK GÜVENLİK DÜZELTMESİ: Access control eklendi
     */
    function setFeeDistributor(address _feeDistributor) external onlyOwner {
        require(_feeDistributor != address(0), "StableSwap3Pool: Invalid address");
        address oldDistributor = address(feeDistributor);
        feeDistributor = FeeDistributor(_feeDistributor);
        emit FeeDistributorUpdated(oldDistributor, _feeDistributor);
    }

    function addLiquidity(uint256 amount0, uint256 amount1, uint256 amount2) external {
        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);
        token2.safeTransferFrom(msg.sender, address(this), amount2);
        
        reserve0 += amount0;
        reserve1 += amount1;
        reserve2 += amount2;
        
        emit AddLiquidity(msg.sender, amount0, amount1, amount2);
    }

    function removeLiquidity(uint256 amount0, uint256 amount1, uint256 amount2) external nonReentrant {
        require(reserve0 >= amount0 && reserve1 >= amount1 && reserve2 >= amount2, "Insufficient liquidity");
        
        reserve0 -= amount0;
        reserve1 -= amount1;
        reserve2 -= amount2;
        
        token0.safeTransfer(msg.sender, amount0);
        token1.safeTransfer(msg.sender, amount1);
        token2.safeTransfer(msg.sender, amount2);
        
        emit RemoveLiquidity(msg.sender, amount0, amount1, amount2);
    }

    /**
     * @param tokenIn 0, 1, or 2 (token0, token1, or token2)
     * @param tokenOut 0, 1, or 2 (token0, token1, or token2)
     * @param amountIn Input amount
     */
    function swap(uint8 tokenIn, uint8 tokenOut, uint256 amountIn) external returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid amount");
        require(tokenIn != tokenOut, "Same token");
        require(tokenIn < 3 && tokenOut < 3, "Invalid token index");

        IERC20 inputToken;
        IERC20 outputToken;
        uint256 inputReserve;
        uint256 outputReserve;

        // Get input token and reserve
        if (tokenIn == 0) {
            inputToken = token0;
            inputReserve = reserve0;
        } else if (tokenIn == 1) {
            inputToken = token1;
            inputReserve = reserve1;
        } else {
            inputToken = token2;
            inputReserve = reserve2;
        }

        // Get output token and reserve
        if (tokenOut == 0) {
            outputToken = token0;
            outputReserve = reserve0;
        } else if (tokenOut == 1) {
            outputToken = token1;
            outputReserve = reserve1;
        } else {
            outputToken = token2;
            outputReserve = reserve2;
        }

        // Transfer input token
        inputToken.safeTransferFrom(msg.sender, address(this), amountIn);

        // Fee hesapla
        uint256 fee = (amountIn * FEE_BPS) / BPS;
        uint256 amountAfterFee = amountIn - fee;
        
        // Stabilcoin için 1:1:1 oran
        amountOut = amountAfterFee;

        require(amountOut > 0, "Insufficient output");
        require(outputReserve >= amountOut, "Insufficient liquidity");

        // DÜZELTME: Fee transfer edildiği için reserve'den çıkarılmalı
        // Update reserves - sadece amountAfterFee kadar ekle
        if (tokenIn == 0) {
            reserve0 += amountAfterFee;
        } else if (tokenIn == 1) {
            reserve1 += amountAfterFee;
        } else {
            reserve2 += amountAfterFee;
        }

        if (tokenOut == 0) {
            reserve0 -= amountOut;
        } else if (tokenOut == 1) {
            reserve1 -= amountOut;
        } else {
            reserve2 -= amountOut;
        }
        
        // Fee'yi fee distributor'a gönder
        if (fee > 0 && address(feeDistributor) != address(0)) {
            inputToken.safeTransfer(address(feeDistributor), fee);
            feeDistributor.collectFee(address(inputToken), fee);
        }

        // Transfer output token
        outputToken.safeTransfer(msg.sender, amountOut);

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    function getReserves() external view returns (uint256, uint256, uint256) {
        return (reserve0, reserve1, reserve2);
    }

    function getAmountOut(uint256 amountIn, uint8 tokenIn, uint8 tokenOut) external pure returns (uint256) {
        require(tokenIn != tokenOut, "Same token");
        if (amountIn == 0) return 0;
        
        // Stabilcoin için 1:1:1 oran + küçük fee
        return amountIn * (BPS - FEE_BPS) / BPS;
    }
}

