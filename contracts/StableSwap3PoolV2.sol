// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {LPToken} from "./LPToken.sol";

/**
 * @title StableSwap3PoolV2 (3-coin with Fee Distribution)
 * @notice 3-token StableSwap with LP tokens and admin fee collection
 * @dev Fee split: LP holders get lpFee, FeeDistributor gets adminFee
 */
contract StableSwap3PoolV2 is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;

    IERC20 public immutable token0;
    IERC20 public immutable token1;
    IERC20 public immutable token2;

    uint8 public immutable decimals0;
    uint8 public immutable decimals1;
    uint8 public immutable decimals2;

    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public reserve2;

    uint256 public feeBps;        // Total fee (e.g., 4 = 0.04%)
    uint256 public adminFeeBps;   // Admin fee share of total fee (e.g., 5000 = 50%)

    LPToken public immutable lp;

    // Fee collection
    address public feeDistributor;
    uint256 public collectedFees0;
    uint256 public collectedFees1;
    uint256 public collectedFees2;

    // Flash loan protection
    mapping(address => uint256) public lastActionBlock;
    bool public flashLoanProtectionEnabled = true;

    event AddLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 amount2, uint256 lpMinted);
    event RemoveLiquidity(address indexed provider, uint256 lpBurned, uint256 amount0, uint256 amount1, uint256 amount2);
    event Swap(address indexed user, uint8 tokenIn, uint8 tokenOut, uint256 amountIn, uint256 amountOut, uint256 adminFee);
    event FeeDistributorUpdated(address indexed oldDistributor, address indexed newDistributor);
    event FeesCollected(address indexed collector, uint256 amount0, uint256 amount1, uint256 amount2);

    constructor(
        address _token0,
        address _token1,
        address _token2,
        uint8 _dec0,
        uint8 _dec1,
        uint8 _dec2,
        uint256 _feeBps,
        uint256 _adminFeeBps,
        address _feeDistributor,
        address _lpOwner
    ) Ownable(msg.sender) {
        require(_token0 != address(0) && _token1 != address(0) && _token2 != address(0), "3pool: zero address");
        require(_token0 != _token1 && _token1 != _token2 && _token0 != _token2, "3pool: same tokens");
        require(_adminFeeBps <= BPS, "3pool: adminFee > 100%");

        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        token2 = IERC20(_token2);
        decimals0 = _dec0;
        decimals1 = _dec1;
        decimals2 = _dec2;
        feeBps = _feeBps;
        adminFeeBps = _adminFeeBps;
        feeDistributor = _feeDistributor;

        lp = new LPToken("StableSwap 3Pool LP V2", "s3LPv2");
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
            require(lastActionBlock[msg.sender] < block.number, "3pool: wait next block");
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

    function getReserves() external view returns (uint256, uint256, uint256) {
        return (reserve0, reserve1, reserve2);
    }

    function addLiquidity(
        uint256 amount0,
        uint256 amount1,
        uint256 amount2,
        uint256 minLpOut
    ) external whenNotPaused nonReentrant flashLoanGuard returns (uint256 lpOut) {
        require(amount0 > 0 || amount1 > 0 || amount2 > 0, "add: zero amounts");

        if (amount0 > 0) token0.safeTransferFrom(msg.sender, address(this), amount0);
        if (amount1 > 0) token1.safeTransferFrom(msg.sender, address(this), amount1);
        if (amount2 > 0) token2.safeTransferFrom(msg.sender, address(this), amount2);

        uint256 dx = _scaleTo1e18(amount0, decimals0);
        uint256 dy = _scaleTo1e18(amount1, decimals1);
        uint256 dz = _scaleTo1e18(amount2, decimals2);
        uint256 totalDeposit = dx + dy + dz;

        if (lp.totalSupply() == 0) {
            lpOut = totalDeposit;
        } else {
            uint256 scaledReserve0 = _scaleTo1e18(reserve0, decimals0);
            uint256 scaledReserve1 = _scaleTo1e18(reserve1, decimals1);
            uint256 scaledReserve2 = _scaleTo1e18(reserve2, decimals2);
            uint256 totalReserves = scaledReserve0 + scaledReserve1 + scaledReserve2;
            lpOut = (lp.totalSupply() * totalDeposit) / totalReserves;
        }

        require(lpOut >= minLpOut, "add: slippage");

        reserve0 += amount0;
        reserve1 += amount1;
        reserve2 += amount2;

        LPToken(address(lp)).mint(msg.sender, lpOut);
        emit AddLiquidity(msg.sender, amount0, amount1, amount2, lpOut);
    }

    function removeLiquidity(
        uint256 lpAmount,
        uint256 min0,
        uint256 min1,
        uint256 min2
    ) external whenNotPaused nonReentrant flashLoanGuard returns (uint256 amt0, uint256 amt1, uint256 amt2) {
        require(lpAmount > 0, "remove: zero amount");
        uint256 supply = lp.totalSupply();
        require(supply > 0, "remove: empty");

        LPToken(address(lp)).burn(msg.sender, lpAmount);

        amt0 = (reserve0 * lpAmount) / supply;
        amt1 = (reserve1 * lpAmount) / supply;
        amt2 = (reserve2 * lpAmount) / supply;

        require(amt0 >= min0 && amt1 >= min1 && amt2 >= min2, "remove: slippage");

        reserve0 -= amt0;
        reserve1 -= amt1;
        reserve2 -= amt2;

        if (amt0 > 0) token0.safeTransfer(msg.sender, amt0);
        if (amt1 > 0) token1.safeTransfer(msg.sender, amt1);
        if (amt2 > 0) token2.safeTransfer(msg.sender, amt2);

        emit RemoveLiquidity(msg.sender, lpAmount, amt0, amt1, amt2);
    }

    function swap(
        uint8 tokenIn,
        uint8 tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external whenNotPaused nonReentrant flashLoanGuard returns (uint256 amountOut) {
        require(amountIn > 0, "swap: zero amount");
        require(tokenIn != tokenOut, "swap: same token");
        require(tokenIn < 3 && tokenOut < 3, "swap: invalid token index");

        IERC20 inputToken;
        IERC20 outputToken;
        uint256 inputReserve;
        uint256 outputReserve;
        uint8 inputDecimals;
        uint8 outputDecimals;

        if (tokenIn == 0) {
            inputToken = token0;
            inputReserve = reserve0;
            inputDecimals = decimals0;
        } else if (tokenIn == 1) {
            inputToken = token1;
            inputReserve = reserve1;
            inputDecimals = decimals1;
        } else {
            inputToken = token2;
            inputReserve = reserve2;
            inputDecimals = decimals2;
        }

        if (tokenOut == 0) {
            outputToken = token0;
            outputReserve = reserve0;
            outputDecimals = decimals0;
        } else if (tokenOut == 1) {
            outputToken = token1;
            outputReserve = reserve1;
            outputDecimals = decimals1;
        } else {
            outputToken = token2;
            outputReserve = reserve2;
            outputDecimals = decimals2;
        }

        inputToken.safeTransferFrom(msg.sender, address(this), amountIn);

        // Calculate fee (1:1 swap for stablecoins)
        uint256 totalFee = (amountIn * feeBps) / BPS;
        uint256 adminFee = (totalFee * adminFeeBps) / BPS;
        uint256 lpFee = totalFee - adminFee;
        amountOut = amountIn - totalFee;

        require(amountOut > 0, "swap: insufficient output");
        require(outputReserve >= amountOut, "swap: insufficient liquidity");
        require(amountOut >= minAmountOut, "swap: slippage");

        // Update reserves - input increases by amountIn, lpFee stays in pool
        if (tokenIn == 0) {
            reserve0 += amountIn;
            collectedFees0 += adminFee;
        } else if (tokenIn == 1) {
            reserve1 += amountIn;
            collectedFees1 += adminFee;
        } else {
            reserve2 += amountIn;
            collectedFees2 += adminFee;
        }

        // Output decreases
        if (tokenOut == 0) {
            reserve0 -= amountOut;
        } else if (tokenOut == 1) {
            reserve1 -= amountOut;
        } else {
            reserve2 -= amountOut;
        }

        outputToken.safeTransfer(msg.sender, amountOut);
        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut, adminFee);
    }

    /**
     * @notice Collect admin fees and send to FeeDistributor
     */
    function collectFees() external nonReentrant returns (uint256 amount0, uint256 amount1, uint256 amount2) {
        require(feeDistributor != address(0), "3pool: no feeDistributor");

        amount0 = collectedFees0;
        amount1 = collectedFees1;
        amount2 = collectedFees2;

        if (amount0 > 0) {
            collectedFees0 = 0;
            reserve0 -= amount0;
            token0.safeTransfer(feeDistributor, amount0);
        }
        if (amount1 > 0) {
            collectedFees1 = 0;
            reserve1 -= amount1;
            token1.safeTransfer(feeDistributor, amount1);
        }
        if (amount2 > 0) {
            collectedFees2 = 0;
            reserve2 -= amount2;
            token2.safeTransfer(feeDistributor, amount2);
        }

        emit FeesCollected(msg.sender, amount0, amount1, amount2);
    }

    function getAmountOut(uint256 amountIn, uint8 tokenIn, uint8 tokenOut) external view returns (uint256) {
        require(tokenIn != tokenOut, "same token");
        if (amountIn == 0) return 0;
        return amountIn * (BPS - feeBps) / BPS;
    }

    function setParams(uint256 _feeBps, uint256 _adminFeeBps) external onlyOwner {
        require(_feeBps < 1000, "fee too high");
        require(_adminFeeBps <= BPS, "adminFee > 100%");
        feeBps = _feeBps;
        adminFeeBps = _adminFeeBps;
    }

    function emergencyWithdraw(address token, address to, uint256 amount) external onlyOwner whenPaused {
        require(to != address(0), "3pool: to zero");
        IERC20(token).safeTransfer(to, amount);
    }
}
