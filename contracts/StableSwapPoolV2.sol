// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {LPToken} from "./LPToken.sol";

/**
 * @title StableSwapPoolV2 (2-coin with Fee Distribution)
 * @notice StableSwap with LP tokens and admin fee collection for FeeDistributor
 * @dev Fee split: LP holders get lpFeeBps, FeeDistributor gets adminFeeBps
 */
contract StableSwapPoolV2 is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 private constant A_MULTIPLIER = 100;
    uint256 private constant PRECISION = 1e18;
    uint256 private constant MAX_ITER = 255;

    IERC20 public immutable token0;
    IERC20 public immutable token1;
    uint8 public immutable decimals0;
    uint8 public immutable decimals1;

    uint256 public x;  // token0 balance (scaled to 1e18)
    uint256 public y;  // token1 balance (scaled to 1e18)

    uint256 public A;
    uint256 public feeBps;        // Total fee (e.g., 4 = 0.04%)
    uint256 public adminFeeBps;   // Admin fee share of total fee (e.g., 5000 = 50%)
    uint256 public constant BPS = 10_000;

    LPToken public immutable lp;

    // Fee collection
    address public feeDistributor;
    uint256 public collectedFees0;  // Accumulated admin fees in token0
    uint256 public collectedFees1;  // Accumulated admin fees in token1

    // Flash loan protection
    mapping(address => uint256) public lastActionBlock;
    bool public flashLoanProtectionEnabled = true;

    event AddLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpMinted);
    event RemoveLiquidity(address indexed provider, uint256 lpBurned, uint256 amount0, uint256 amount1);
    event Swap(address indexed trader, uint256 amountIn, bool zeroForOne, uint256 amountOut, uint256 adminFee);
    event SetParams(uint256 A, uint256 feeBps, uint256 adminFeeBps);
    event FeeDistributorUpdated(address indexed oldDistributor, address indexed newDistributor);
    event FeesCollected(address indexed collector, uint256 amount0, uint256 amount1);

    constructor(
        address _token0,
        address _token1,
        uint8 _dec0,
        uint8 _dec1,
        uint256 _A,
        uint256 _feeBps,
        uint256 _adminFeeBps,
        address _feeDistributor,
        address _lpOwner
    ) Ownable(msg.sender) {
        require(_token0 != address(0) && _token1 != address(0), "pool: zero address");
        require(_token0 != _token1, "pool: same token");
        require(_A > 0, "pool: A=0");
        require(_adminFeeBps <= BPS, "pool: adminFee > 100%");

        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        decimals0 = _dec0;
        decimals1 = _dec1;
        A = _A;
        feeBps = _feeBps;
        adminFeeBps = _adminFeeBps;
        feeDistributor = _feeDistributor;

        lp = new LPToken("StableSwap LP V2", "sLPv2");
        LPToken(address(lp)).setPool(address(this));
        lp.transferOwnership(_lpOwner);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    function setFlashLoanProtection(bool _enabled) external onlyOwner {
        flashLoanProtectionEnabled = _enabled;
    }

    function setFeeDistributor(address _feeDistributor) external onlyOwner {
        emit FeeDistributorUpdated(feeDistributor, _feeDistributor);
        feeDistributor = _feeDistributor;
    }

    modifier flashLoanGuard() {
        if (flashLoanProtectionEnabled) {
            require(lastActionBlock[msg.sender] < block.number, "pool: wait next block");
        }
        _;
        lastActionBlock[msg.sender] = block.number;
    }

    function _scaleTo1e18(uint256 amount, uint8 dec) internal pure returns (uint256) {
        if (dec == 18) return amount;
        if (dec < 18) return amount * 10 ** (18 - dec);
        return amount / 10 ** (dec - 18);
    }

    function _unscaleFrom1e18(uint256 amount, uint8 dec) internal pure returns (uint256) {
        if (dec == 18) return amount;
        if (dec < 18) return amount / 10 ** (18 - dec);
        return amount * 10 ** (dec - 18);
    }

    function getReserves() external view returns (uint256 reserve0, uint256 reserve1) {
        reserve0 = _unscaleFrom1e18(x, decimals0);
        reserve1 = _unscaleFrom1e18(y, decimals1);
    }

    function _getD(uint256 _x, uint256 _y, uint256 _A) internal pure returns (uint256 D) {
        if (_x == 0 && _y == 0) return 0;
        uint256 S = _x + _y;
        D = S;
        uint256 Ann = _A * 4;

        for (uint256 i = 0; i < MAX_ITER; ++i) {
            uint256 D2 = (D * D) / PRECISION;
            uint256 D3 = (D2 * D) / PRECISION;
            uint256 prod = (_x * _y) / PRECISION;
            if (prod == 0) { D = S; break; }
            uint256 D_P = (D3 * PRECISION) / (4 * prod);
            uint256 prevD = D;
            uint256 numerator = ((Ann * S) + (2 * D_P)) * D;
            uint256 denominator = ((Ann - 1) * D) + (3 * D_P);
            D = numerator / denominator;
            if (D > prevD ? D - prevD <= 1 : prevD - D <= 1) break;
        }
    }

    function _getY(uint256 _xNew, uint256 _D, uint256 _A) internal pure returns (uint256 yNew) {
        require(_xNew > 0, "getY: x=0");
        uint256 Ann = _A * 4;
        uint256 D2 = (_D * _D) / PRECISION;
        uint256 D3 = (D2 * _D) / PRECISION;
        uint256 c = (D3 * PRECISION * PRECISION) / (Ann * 4 * _xNew);
        uint256 b = _xNew + (_D / Ann);
        yNew = _D;

        for (uint256 i = 0; i < MAX_ITER; ++i) {
            uint256 yPrev = yNew;
            uint256 y2 = yNew * yNew;
            uint256 numerator = y2 + c;
            uint256 denominator = (2 * yNew) + b - _D;
            yNew = numerator / denominator;
            if (yNew > yPrev ? yNew - yPrev <= 1 : yPrev - yNew <= 1) break;
        }
    }

    function addLiquidity(uint256 amount0, uint256 amount1, uint256 minLpOut)
        external whenNotPaused nonReentrant flashLoanGuard returns (uint256 lpOut)
    {
        require(amount0 > 0 && amount1 > 0, "add: zero amount");

        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);

        uint256 dx = _scaleTo1e18(amount0, decimals0);
        uint256 dy = _scaleTo1e18(amount1, decimals1);

        uint256 D0 = _getD(x, y, A);
        uint256 D1 = _getD(x + dx, y + dy, A);

        if (lp.totalSupply() == 0) {
            lpOut = D1;
        } else {
            lpOut = (lp.totalSupply() * (D1 - D0)) / D0;
        }
        require(lpOut >= minLpOut, "add: slippage");

        x = x + dx;
        y = y + dy;

        LPToken(address(lp)).mint(msg.sender, lpOut);
        emit AddLiquidity(msg.sender, amount0, amount1, lpOut);
    }

    function removeLiquidity(uint256 lpAmount, uint256 min0, uint256 min1)
        external whenNotPaused nonReentrant flashLoanGuard returns (uint256 amt0, uint256 amt1)
    {
        require(lpAmount > 0, "remove: zero amount");
        uint256 supply = lp.totalSupply();
        require(supply > 0, "remove: empty");

        LPToken(address(lp)).burn(msg.sender, lpAmount);

        uint256 dx = (x * lpAmount) / supply;
        uint256 dy = (y * lpAmount) / supply;

        x = x - dx;
        y = y - dy;

        amt0 = _unscaleFrom1e18(dx, decimals0);
        amt1 = _unscaleFrom1e18(dy, decimals1);

        require(amt0 >= min0 && amt1 >= min1, "remove: slippage");

        token0.safeTransfer(msg.sender, amt0);
        token1.safeTransfer(msg.sender, amt1);

        emit RemoveLiquidity(msg.sender, lpAmount, amt0, amt1);
    }

    function swap(bool zeroForOne, uint256 amountIn, uint256 minAmountOut)
        external whenNotPaused nonReentrant flashLoanGuard returns (uint256 amountOut)
    {
        require(amountIn > 0, "swap: zero in");

        uint256 adminFeeCollected;

        if (zeroForOne) {
            token0.safeTransferFrom(msg.sender, address(this), amountIn);
            uint256 dx = _scaleTo1e18(amountIn, decimals0);

            uint256 D = _getD(x, y, A);
            uint256 xNew = x + dx;
            uint256 yNew = _getY(xNew, D, A);
            require(yNew < y, "swap: no out");

            uint256 dy = y - yNew;
            uint256 totalFee = (dy * feeBps) / BPS;
            uint256 adminFee = (totalFee * adminFeeBps) / BPS;
            uint256 lpFee = totalFee - adminFee;
            uint256 dyOut = dy - totalFee;

            // LP fee stays in pool
            x = xNew;
            y = yNew + lpFee;

            // Collect admin fee
            if (adminFee > 0) {
                uint256 adminFeeUnscaled = _unscaleFrom1e18(adminFee, decimals1);
                collectedFees1 += adminFeeUnscaled;
                adminFeeCollected = adminFeeUnscaled;
            }

            amountOut = _unscaleFrom1e18(dyOut, decimals1);
            require(amountOut >= minAmountOut, "swap: slippage");

            token1.safeTransfer(msg.sender, amountOut);
            emit Swap(msg.sender, amountIn, true, amountOut, adminFeeCollected);
        } else {
            token1.safeTransferFrom(msg.sender, address(this), amountIn);
            uint256 dy = _scaleTo1e18(amountIn, decimals1);

            uint256 D = _getD(x, y, A);
            uint256 yNew = y + dy;
            uint256 xNew = _getY(yNew, D, A);
            require(xNew < x, "swap: no out");

            uint256 dx = x - xNew;
            uint256 totalFee = (dx * feeBps) / BPS;
            uint256 adminFee = (totalFee * adminFeeBps) / BPS;
            uint256 lpFee = totalFee - adminFee;
            uint256 dxOut = dx - totalFee;

            x = xNew + lpFee;
            y = yNew;

            if (adminFee > 0) {
                uint256 adminFeeUnscaled = _unscaleFrom1e18(adminFee, decimals0);
                collectedFees0 += adminFeeUnscaled;
                adminFeeCollected = adminFeeUnscaled;
            }

            amountOut = _unscaleFrom1e18(dxOut, decimals0);
            require(amountOut >= minAmountOut, "swap: slippage");

            token0.safeTransfer(msg.sender, amountOut);
            emit Swap(msg.sender, amountIn, false, amountOut, adminFeeCollected);
        }
    }

    /**
     * @notice Collect admin fees and send to FeeDistributor
     * @dev Can be called by anyone, fees go to feeDistributor
     */
    function collectFees() external nonReentrant returns (uint256 amount0, uint256 amount1) {
        require(feeDistributor != address(0), "pool: no feeDistributor");

        amount0 = collectedFees0;
        amount1 = collectedFees1;

        if (amount0 > 0) {
            collectedFees0 = 0;
            token0.safeTransfer(feeDistributor, amount0);
        }
        if (amount1 > 0) {
            collectedFees1 = 0;
            token1.safeTransfer(feeDistributor, amount1);
        }

        emit FeesCollected(msg.sender, amount0, amount1);
    }

    function setParams(uint256 _A, uint256 _feeBps, uint256 _adminFeeBps) external onlyOwner {
        require(_A > 0, "A=0");
        require(_feeBps < 1000, "fee too high");
        require(_adminFeeBps <= BPS, "adminFee > 100%");
        A = _A;
        feeBps = _feeBps;
        adminFeeBps = _adminFeeBps;
        emit SetParams(_A, _feeBps, _adminFeeBps);
    }

    function getAmountOut(uint256 amountIn, bool zeroForOne) external view returns (uint256) {
        if (amountIn == 0) return 0;

        uint256 scaledIn = zeroForOne
            ? _scaleTo1e18(amountIn, decimals0)
            : _scaleTo1e18(amountIn, decimals1);

        uint256 D = _getD(x, y, A);
        uint256 newIn;
        uint256 newOut;

        if (zeroForOne) {
            newIn = x + scaledIn;
            newOut = _getY(newIn, D, A);
            if (newOut >= y) return 0;
            uint256 dy = y - newOut;
            uint256 fee = (dy * feeBps) / BPS;
            return _unscaleFrom1e18(dy - fee, decimals1);
        } else {
            newIn = y + scaledIn;
            newOut = _getY(newIn, D, A);
            if (newOut >= x) return 0;
            uint256 dx = x - newOut;
            uint256 fee = (dx * feeBps) / BPS;
            return _unscaleFrom1e18(dx - fee, decimals0);
        }
    }

    // Emergency withdraw
    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner whenPaused {
        require(to != address(0), "pool: to zero");
        IERC20(token).safeTransfer(to, amount);
    }
}
