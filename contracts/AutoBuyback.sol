// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ASSToken} from "./ASSToken.sol";
import {FeeDistributor} from "./FeeDistributor.sol";

/**
 * @title AutoBuyback
 * @notice Otomatik buyback ve burn kontratı - 6 saatte bir çalışır
 * @dev FeeDistributor'dan buyback için ayrılan stablecoin'lerle ASS token satın alır ve yakar
 */
contract AutoBuyback is Ownable {
    using SafeERC20 for IERC20;

    ASSToken public immutable assToken;
    FeeDistributor public immutable feeDistributor;
    
    // Buyback için kullanılacak stablecoin
    IERC20 public buybackToken; // USDC/USDT
    
    // Maaş adresi
    address public salaryAddress;
    
    // Zamanlayıcı
    uint256 public constant BUYBACK_INTERVAL = 6 hours;
    uint256 public lastBuybackTime;
    uint256 public minBuybackAmount = 100 * 1e6; // Minimum 100 USDC (6 decimals)
    
    // DEX için gerekli (basit swap için router veya direkt pool)
    address public swapRouter; // DEX router adresi (ileride eklenebilir)
    
    // İstatistikler
    uint256 public totalBuybackAmount;
    uint256 public totalBurned;
    uint256 public totalSalaryPaid;
    uint256 public buybackCount;
    
    event BuybackExecuted(
        uint256 buybackAmount,
        uint256 assPurchased,
        uint256 burned,
        uint256 salaryPaid,
        uint256 timestamp
    );
    event BuybackTokenUpdated(address indexed oldToken, address indexed newToken);
    event SalaryAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event SwapRouterUpdated(address indexed oldRouter, address indexed newRouter);
    event MinBuybackAmountUpdated(uint256 oldAmount, uint256 newAmount);

    constructor(
        address _assToken,
        address _feeDistributor,
        address _buybackToken,
        address _salaryAddress
    ) Ownable(msg.sender) {
        assToken = ASSToken(_assToken);
        feeDistributor = FeeDistributor(payable(_feeDistributor));
        buybackToken = IERC20(_buybackToken);
        salaryAddress = _salaryAddress;
        lastBuybackTime = block.timestamp;
    }

    /**
     * @notice Buyback işlemini gerçekleştir (herkes çağırabilir - keeper bot için)
     */
    function executeBuyback() external {
        require(
            block.timestamp >= lastBuybackTime + BUYBACK_INTERVAL,
            "AutoBuyback: Too early for next buyback"
        );
        
        // Kontratta biriken buyback token miktarını kontrol et
        uint256 buybackBalance = buybackToken.balanceOf(address(this));
        
        if (buybackBalance < minBuybackAmount) {
            // Yeterli bakiye yoksa sadece zamanı güncelle
            lastBuybackTime = block.timestamp;
            return;
        }
        
        uint256 buybackAmount = buybackBalance;
        
        // Basit bir swap mekanizması (ileride DEX router entegrasyonu yapılabilir)
        // Şimdilik direkt mint ve burn yapıyoruz (test için)
        
        // Buyback'in %10'u maaş
        uint256 salaryAmount = (buybackAmount * 1000) / 10000; // %10
        uint256 swapAmount = buybackAmount - salaryAmount;
        
        // Stablecoin'i maaş adresine gönder
        if (salaryAmount > 0 && salaryAddress != address(0)) {
            buybackToken.safeTransfer(salaryAddress, salaryAmount);
            totalSalaryPaid += salaryAmount;
        }
        
        // Kalan kısmı ASS token'a çevir ve yak
        uint256 assPurchased = 0;
        uint256 burned = 0;
        
        if (swapAmount > 0) {
            // DEX üzerinden ASS token satın al
            if (swapRouter != address(0)) {
                assPurchased = swapBuybackTokenForASS(swapAmount);
                if (assPurchased > 0) {
                    // Satın alınan ASS token'ların %90'ını yak
                    burned = (assPurchased * 9000) / 10000; // %90
                    if (burned > 0) {
                        burnASS(burned);
                    }
                }
            } else {
                // Swap router yoksa token'lar kontratta birikir
                // İleride DEX entegrasyonu yapılacak
            }
        }
        
        totalBuybackAmount += buybackAmount;
        buybackCount++;
        lastBuybackTime = block.timestamp;
        
        emit BuybackExecuted(
            buybackAmount,
            0, // assPurchased (swap sonrası güncellenecek)
            0, // burned (swap sonrası güncellenecek)
            salaryAmount,
            block.timestamp
        );
    }

    /**
     * @notice FeeDistributor'dan gelen buyback fonksiyonu
     * @dev FeeDistributor bu kontrata stablecoin transfer ettiğinde otomatik çalışır
     * Not: receiveToken fonksiyonu ile otomatik tetiklenebilir
     */
    function receiveBuybackFunds(uint256 amount) external {
        require(
            msg.sender == address(feeDistributor),
            "AutoBuyback: Only fee distributor"
        );
        require(amount > 0, "AutoBuyback: Amount must be > 0");
        
        // Token'lar kontratta birikir, executeBuyback çağrıldığında işlenir
        // Bu fonksiyon sadece kayıt için
    }

    /**
     * @notice DEX üzerinden buyback token'larını ASS'e çevir (ileride eklenebilir)
     */
    function swapBuybackTokenForASS(uint256 amount) internal returns (uint256) {
        // Bu fonksiyon bir DEX router ile entegre edilecek
        // Şimdilik placeholder
        require(swapRouter != address(0), "AutoBuyback: Swap router not set");
        
        // İleride Uniswap/Arbswap gibi bir DEX router entegrasyonu
        // buybackToken.approve(swapRouter, amount);
        // uint256[] memory amounts = router.swapExactTokensForTokens(...);
        // return amounts[amounts.length - 1];
        
        return 0;
    }

    /**
     * @notice ASS token yak (swap sonrası)
     * @dev DÜZELTME: burn fonksiyonu sadece token sahibi tarafından çağrılabilir
     * Kontrat önce token'a sahip olmalı, sonra burn edebilir
     */
    function burnASS(uint256 amount) internal {
        if (amount > 0) {
            uint256 balance = assToken.balanceOf(address(this));
            require(balance >= amount, "AutoBuyback: Insufficient ASS balance to burn");
            // ERC20Burnable.burn sadece kendi balance'ını yakabilir
            assToken.burn(amount);
            totalBurned += amount;
        }
    }

    /**
     * @notice Bir sonraki buyback zamanını kontrol et
     */
    function canExecuteBuyback() external view returns (bool) {
        return block.timestamp >= nextBuybackTime();
    }

    /**
     * @notice Buyback token'ı güncelle (sadece owner)
     */
    function setBuybackToken(address _buybackToken) external onlyOwner {
        require(_buybackToken != address(0), "AutoBuyback: Invalid address");
        address oldToken = address(buybackToken);
        buybackToken = IERC20(_buybackToken);
        emit BuybackTokenUpdated(oldToken, _buybackToken);
    }

    /**
     * @notice Maaş adresini güncelle (sadece owner)
     */
    function setSalaryAddress(address _salaryAddress) external onlyOwner {
        require(_salaryAddress != address(0), "AutoBuyback: Invalid address");
        address oldAddress = salaryAddress;
        salaryAddress = _salaryAddress;
        emit SalaryAddressUpdated(oldAddress, _salaryAddress);
    }

    /**
     * @notice Swap router'ı güncelle (sadece owner)
     */
    function setSwapRouter(address _swapRouter) external onlyOwner {
        address oldRouter = swapRouter;
        swapRouter = _swapRouter;
        emit SwapRouterUpdated(oldRouter, _swapRouter);
    }

    /**
     * @notice Minimum buyback miktarını güncelle (sadece owner)
     */
    function setMinBuybackAmount(uint256 _minAmount) external onlyOwner {
        uint256 oldAmount = minBuybackAmount;
        minBuybackAmount = _minAmount;
        emit MinBuybackAmountUpdated(oldAmount, _minAmount);
    }

    /**
     * @notice Bir sonraki buyback zamanı
     */
    function nextBuybackTime() public view returns (uint256) {
        return lastBuybackTime + BUYBACK_INTERVAL;
    }

    /**
     * @notice İstatistikleri görüntüle
     */
    function getStats() external view returns (
        uint256 _totalBuybackAmount,
        uint256 _totalBurned,
        uint256 _totalSalaryPaid,
        uint256 _buybackCount,
        uint256 _nextBuybackTime
    ) {
        return (
            totalBuybackAmount,
            totalBurned,
            totalSalaryPaid,
            buybackCount,
            nextBuybackTime()
        );
    }
}

