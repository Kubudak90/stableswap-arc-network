// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ASSToken} from "./ASSToken.sol";
import {FeeDistributor} from "./FeeDistributor.sol";

// Uniswap V2 style router interface
interface ISwapRouter {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function getAmountsOut(
        uint256 amountIn,
        address[] calldata path
    ) external view returns (uint256[] memory amounts);
}

/**
 * @title AutoBuyback
 * @notice Otomatik buyback ve burn kontratı - 6 saatte bir çalışır
 * @dev FeeDistributor'dan buyback için ayrılan stablecoin'lerle ASS token satın alır ve yakar
 * Pausable ve ReentrancyGuard ile güvenli
 */
contract AutoBuyback is Ownable, Pausable, ReentrancyGuard {
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

    // DEX router
    ISwapRouter public swapRouter;

    // Slippage tolerance (basis points, 100 = 1%)
    uint256 public slippageTolerance = 500; // 5% default
    uint256 public constant MAX_SLIPPAGE = 2000; // Max 20%

    // Fee distribution percentages (basis points)
    uint256 public constant SALARY_PERCENTAGE = 1000;    // %10 maaş payı
    uint256 public constant BURN_PERCENTAGE = 9000;      // %90 burn oranı
    uint256 public constant PERCENTAGE_BASE = 10000;     // Yüzde hesaplama tabanı
    uint256 public constant SWAP_DEADLINE = 300;         // 5 dakika deadline (saniye)

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
    event ManualBuybackExecuted(
        address indexed executor,
        uint256 stablecoinAmount,
        uint256 assAmount,
        uint256 burned
    );
    event BuybackTokenUpdated(address indexed oldToken, address indexed newToken);
    event SalaryAddressUpdated(address indexed oldAddress, address indexed newAddress);
    event SwapRouterUpdated(address indexed oldRouter, address indexed newRouter);
    event MinBuybackAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event SlippageToleranceUpdated(uint256 oldSlippage, uint256 newSlippage);
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);

    constructor(
        address _assToken,
        address _feeDistributor,
        address _buybackToken,
        address _salaryAddress
    ) Ownable(msg.sender) {
        require(_assToken != address(0), "AutoBuyback: assToken zero address");
        require(_feeDistributor != address(0), "AutoBuyback: feeDistributor zero address");
        require(_buybackToken != address(0), "AutoBuyback: buybackToken zero address");
        require(_salaryAddress != address(0), "AutoBuyback: salaryAddress zero address");

        assToken = ASSToken(_assToken);
        feeDistributor = FeeDistributor(payable(_feeDistributor));
        buybackToken = IERC20(_buybackToken);
        salaryAddress = _salaryAddress;
        lastBuybackTime = block.timestamp;
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

    /**
     * @notice Buyback işlemini gerçekleştir (herkes çağırabilir - keeper bot için)
     */
    function executeBuyback() external whenNotPaused nonReentrant {
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

        // Buyback'in %10'u maaş
        uint256 salaryAmount = (buybackAmount * SALARY_PERCENTAGE) / PERCENTAGE_BASE;
        uint256 swapAmount = buybackAmount - salaryAmount;

        // Stablecoin'i maaş adresine gönder
        if (salaryAmount > 0 && salaryAddress != address(0)) {
            buybackToken.safeTransfer(salaryAddress, salaryAmount);
            totalSalaryPaid += salaryAmount;
        }

        // Kalan kısmı ASS token'a çevir ve yak
        uint256 assPurchased = 0;
        uint256 burned = 0;

        if (swapAmount > 0 && address(swapRouter) != address(0)) {
            assPurchased = _swapBuybackTokenForASS(swapAmount);
            if (assPurchased > 0) {
                // Satın alınan ASS token'ların %90'ını yak
                burned = (assPurchased * BURN_PERCENTAGE) / PERCENTAGE_BASE;
                if (burned > 0) {
                    _burnASS(burned);
                }
            }
        }

        totalBuybackAmount += buybackAmount;
        buybackCount++;
        lastBuybackTime = block.timestamp;

        emit BuybackExecuted(
            buybackAmount,
            assPurchased,
            burned,
            salaryAmount,
            block.timestamp
        );
    }

    /**
     * @notice Manuel buyback - owner ASS token gönderir, kontrat burn eder
     * @dev Swap router yokken veya acil durumlarda kullanılır
     * @param assAmount Burn edilecek ASS miktarı (owner'ın gönderdiği)
     */
    function manualBuyback(uint256 assAmount) external onlyOwner whenNotPaused nonReentrant {
        require(assAmount > 0, "AutoBuyback: Amount must be > 0");

        // Owner ASS token gönderir
        IERC20(address(assToken)).safeTransferFrom(msg.sender, address(this), assAmount);

        // Stablecoin balance'ını kontrol et
        uint256 stablecoinBalance = buybackToken.balanceOf(address(this));

        // %90'ını burn et
        uint256 burnAmount = (assAmount * BURN_PERCENTAGE) / PERCENTAGE_BASE;
        if (burnAmount > 0) {
            _burnASS(burnAmount);
        }

        // Kalan %10 kontratta kalır (veya başka bir işlem için)

        emit ManualBuybackExecuted(msg.sender, stablecoinBalance, assAmount, burnAmount);
    }

    /**
     * @notice FeeDistributor'dan gelen buyback fonksiyonu
     */
    function receiveBuybackFunds(uint256 amount) external view {
        require(
            msg.sender == address(feeDistributor),
            "AutoBuyback: Only fee distributor"
        );
        require(amount > 0, "AutoBuyback: Amount must be > 0");

        // Token'lar kontratta birikir, executeBuyback çağrıldığında işlenir
    }

    /**
     * @notice DEX üzerinden buyback token'larını ASS'e çevir
     */
    function _swapBuybackTokenForASS(uint256 amount) internal returns (uint256) {
        require(address(swapRouter) != address(0), "AutoBuyback: Swap router not set");
        require(amount > 0, "AutoBuyback: Amount must be > 0");

        // Swap path: buybackToken -> ASS
        address[] memory path = new address[](2);
        path[0] = address(buybackToken);
        path[1] = address(assToken);

        // Expected output hesapla
        uint256[] memory amountsOut;
        try swapRouter.getAmountsOut(amount, path) returns (uint256[] memory amounts) {
            amountsOut = amounts;
        } catch {
            // Swap router getAmountsOut başarısız olursa, swap yapmadan dön
            return 0;
        }

        uint256 expectedOut = amountsOut[amountsOut.length - 1];
        if (expectedOut == 0) return 0;

        // Slippage tolerance ile minimum output hesapla
        uint256 minAmountOut = (expectedOut * (PERCENTAGE_BASE - slippageTolerance)) / PERCENTAGE_BASE;

        // Approve swap router
        buybackToken.forceApprove(address(swapRouter), amount);

        // Swap işlemi
        try swapRouter.swapExactTokensForTokens(
            amount,
            minAmountOut,
            path,
            address(this),
            block.timestamp + SWAP_DEADLINE
        ) returns (uint256[] memory amounts) {
            // Reset approval
            buybackToken.forceApprove(address(swapRouter), 0);
            return amounts[amounts.length - 1];
        } catch {
            // Swap başarısız olursa
            buybackToken.forceApprove(address(swapRouter), 0);
            return 0;
        }
    }

    /**
     * @notice ASS token yak
     */
    function _burnASS(uint256 amount) internal {
        if (amount > 0) {
            assToken.burn(amount);
            totalBurned += amount;
        }
    }

    /**
     * @notice Bir sonraki buyback zamanını kontrol et
     */
    function canExecuteBuyback() external view returns (bool) {
        return block.timestamp >= nextBuybackTime() &&
               buybackToken.balanceOf(address(this)) >= minBuybackAmount;
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
        address oldRouter = address(swapRouter);
        swapRouter = ISwapRouter(_swapRouter);
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
     * @notice Slippage tolerance güncelle (sadece owner)
     */
    function setSlippageTolerance(uint256 _slippage) external onlyOwner {
        require(_slippage <= MAX_SLIPPAGE, "AutoBuyback: Slippage too high");
        uint256 oldSlippage = slippageTolerance;
        slippageTolerance = _slippage;
        emit SlippageToleranceUpdated(oldSlippage, _slippage);
    }

    /**
     * @notice Emergency withdraw - sadece owner, pause durumunda
     * @dev Acil durumlarda token kurtarmak için
     */
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner whenPaused {
        require(to != address(0), "AutoBuyback: Invalid address");
        require(amount > 0, "AutoBuyback: Amount must be > 0");

        IERC20(token).safeTransfer(to, amount);
        emit EmergencyWithdraw(token, to, amount);
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
        uint256 _nextBuybackTime,
        uint256 _pendingBuyback
    ) {
        return (
            totalBuybackAmount,
            totalBurned,
            totalSalaryPaid,
            buybackCount,
            nextBuybackTime(),
            buybackToken.balanceOf(address(this))
        );
    }
}
