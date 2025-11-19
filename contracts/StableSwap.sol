// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {FeeDistributor} from "./FeeDistributor.sol";

/**
 * @title StableSwap
 * @notice Basit stabilcoin swap - 1:1 oranı korur, fee distribution entegre
 */
contract StableSwap is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token0;
    IERC20 public immutable token1;
    
    uint256 public reserve0;
    uint256 public reserve1;
    
    uint256 public constant FEE_BPS = 4; // 0.04% fee (4 bps)
    uint256 public constant BPS = 10000;
    
    FeeDistributor public feeDistributor;

    event Swap(address indexed user, bool zeroForOne, uint256 amountIn, uint256 amountOut);
    event AddLiquidity(address indexed provider, uint256 amount0, uint256 amount1);
    event RemoveLiquidity(address indexed provider, uint256 amount0, uint256 amount1);
    event FeeDistributorUpdated(address indexed oldDistributor, address indexed newDistributor);

    constructor(address _token0, address _token1) Ownable(msg.sender) {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
    }
    
    /**
     * @notice Fee distributor'ı ayarla (sadece owner)
     * @dev KRİTİK GÜVENLİK DÜZELTMESİ: Access control eklendi
     */
    function setFeeDistributor(address _feeDistributor) external onlyOwner {
        require(_feeDistributor != address(0), "StableSwap: Invalid address");
        address oldDistributor = address(feeDistributor);
        feeDistributor = FeeDistributor(_feeDistributor);
        emit FeeDistributorUpdated(oldDistributor, _feeDistributor);
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external {
        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);
        
        reserve0 += amount0;
        reserve1 += amount1;
        
        emit AddLiquidity(msg.sender, amount0, amount1);
    }

    function removeLiquidity(uint256 amount0, uint256 amount1) external nonReentrant {
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
            
            // Fee hesapla
            uint256 fee = (amountIn * FEE_BPS) / BPS;
            uint256 amountAfterFee = amountIn - fee;
            
            // Stabilcoin için 1:1 oran
            amountOut = amountAfterFee;
            
            require(amountOut > 0, "Insufficient output");
            require(reserve1 >= amountOut, "Insufficient liquidity");
            
            // DÜZELTME: Fee transfer edildiği için reserve'den çıkarılmalı
            reserve0 += amountAfterFee;
            reserve1 -= amountOut;
            
            // Fee'yi fee distributor'a gönder
            if (fee > 0 && address(feeDistributor) != address(0)) {
                token0.safeTransfer(address(feeDistributor), fee);
                feeDistributor.collectFee(address(token0), fee);
            }
            
            token1.safeTransfer(msg.sender, amountOut);
        } else {
            // token1 -> token0
            token1.safeTransferFrom(msg.sender, address(this), amountIn);
            
            // Fee hesapla
            uint256 fee = (amountIn * FEE_BPS) / BPS;
            uint256 amountAfterFee = amountIn - fee;
            
            // Stabilcoin için 1:1 oran
            amountOut = amountAfterFee;
            
            require(amountOut > 0, "Insufficient output");
            require(reserve0 >= amountOut, "Insufficient liquidity");
            
            // DÜZELTME: Fee transfer edildiği için reserve'den çıkarılmalı
            reserve1 += amountAfterFee;
            reserve0 -= amountOut;
            
            // Fee'yi fee distributor'a gönder
            if (fee > 0 && address(feeDistributor) != address(0)) {
                token1.safeTransfer(address(feeDistributor), fee);
                feeDistributor.collectFee(address(token1), fee);
            }
            
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
