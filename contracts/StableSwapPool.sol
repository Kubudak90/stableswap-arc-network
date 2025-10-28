// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {LPToken} from "./LPToken.sol";

/**
 * @title StableSwapPool (2-coin)
 * @notice Curve-inspired stableswap AMM for stablecoins (low slippage near peg).
 * @dev Fixed-point math with 1e18 scaling. Iterative getD/getY. No oracle.
 */
contract StableSwapPool is Ownable {
    using SafeERC20 for IERC20;

    uint256 private constant A_MULTIPLIER = 100;     // to allow fractional A changes if needed
    uint256 private constant PRECISION = 1e18;       // fixed-point scale
    uint256 private constant MAX_ITER = 255;

    IERC20 public immutable token0;
    IERC20 public immutable token1;
    uint8 public immutable decimals0;
    uint8 public immutable decimals1;

    // normalized reserves in 1e18
    uint256 public x;  // token0 balance (scaled to 1e18)
    uint256 public y;  // token1 balance (scaled to 1e18)

    // Amplification and fees
    uint256 public A;             // amplification (e.g. 100 -> A=100)
    uint256 public feeBps;        // e.g. 4 -> 0.04% (4 bps)
    uint256 public constant BPS = 10_000;

    LPToken public immutable lp;
    // admin fee share on swap fees (optional, set 0 for MVP)
    uint256 public adminFeeBps;

    event AddLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpMinted);
    event RemoveLiquidity(address indexed provider, uint256 lpBurned, uint256 amount0, uint256 amount1);
    event Swap(address indexed trader, uint256 amountIn, bool zeroForOne, uint256 amountOut);
    event SetParams(uint256 A, uint256 feeBps, uint256 adminFeeBps);

    constructor(
        address _token0,
        address _token1,
        uint8 _dec0,
        uint8 _dec1,
        uint256 _A,
        uint256 _feeBps,
        address _lpOwner
    ) Ownable(msg.sender) {
        require(_token0 != _token1, "pool: same token");
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        decimals0 = _dec0;
        decimals1 = _dec1;
        require(_A > 0, "pool: A=0");
        A = _A;
        feeBps = _feeBps;
        adminFeeBps = 0;

        lp = new LPToken("StableSwap LP", "sLP");
        lp.transferOwnership(_lpOwner);
        LPToken(address(lp)).setPool(address(this));
    }

    // ------------------ Views: helpers ------------------

    function _scaleTo1e18(uint256 amount, uint8 dec) internal pure returns (uint256) {
        if (dec == 18) return amount;
        if (dec < 18) return amount * 10 ** (18 - dec);
        // dec > 18 is rare for ERC20; clamp
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

    // ------------------ Math: getD / getY ------------------

    /**
     * @notice Compute StableSwap invariant D for 2 coins
     * @dev Adapted to 2-coin case. Uses iterative method with fixed-point arithmetic.
     */
    function _getD(uint256 _x, uint256 _y, uint256 _A) internal pure returns (uint256 D) {
        if (_x == 0 && _y == 0) return 0;

        uint256 S = _x + _y;
        D = S;
        // For 2 coins, n = 2
        // Ann = A * n^n = A * 4
        uint256 Ann = _A * 4;

        for (uint256 i = 0; i < MAX_ITER; i++) {
            // D_P = D^3 / (4 * x * y)
            // compute D_P stepwise to avoid overflow (uint256 with 1e18 scale)
            // D^2
            uint256 D2 = (D * D) / PRECISION;
            // D^3
            uint256 D3 = (D2 * D) / PRECISION;

            uint256 prod = (_x * _y) / PRECISION;
            if (prod == 0) {
                // if one side zero, D ~ S
                D = S;
                break;
            }
            uint256 D_P = D3 / (4 * prod);

            uint256 prevD = D;
            // numerator = (Ann*S + 2*D_P) * D
            uint256 numerator = ((Ann * S) + (2 * D_P)) * D;
            // denominator = (Ann - 1)*D + 3*D_P
            uint256 denominator = ((Ann - 1) * D) + (3 * D_P);
            D = numerator / denominator;

            if (D > prevD ? D - prevD <= 1 : prevD - D <= 1) {
                break;
            }
        }
    }

    /**
     * @notice Solve y given x changed by dx, keeping D constant (2-coin case).
     * @dev Returns new y (scaled 1e18) before fee.
     */
    function _getY(
        uint256 _xNew,
        uint256 _D,
        uint256 _A
    ) internal pure returns (uint256 yNew) {
        // From invariant for 2 coins
        // We solve for y via iterative method:
        // c = D^3 / (4 * A * 4 * xNew) = D^3 / (16 * A * xNew)
        // b = D/ A * 2 + xNew
        require(_xNew > 0, "getY: x=0");

        uint256 Ann = _A * 4;
        // D^2
        uint256 D2 = (_D * _D) / PRECISION;
        // D^3
        uint256 D3 = (D2 * _D) / PRECISION;
        uint256 c = (D3 * PRECISION) / (16 * _A * _xNew); // adjust for scale
        uint256 b = (_D / _A) * 2 + _xNew;               // b unscaled sum

        // initial guess
        yNew = _D;

        for (uint256 i = 0; i < MAX_ITER; i++) {
            uint256 yPrev = yNew;
            // y = (y^2 + c) / (2y + b - D)
            uint256 y2 = (yNew * yNew) / PRECISION;
            uint256 numerator = y2 + c;
            uint256 denominator = (2 * yNew) + b - _D;
            yNew = numerator / denominator;

            if (yNew > yPrev ? yNew - yPrev <= 1 : yPrev - yNew <= 1) {
                break;
            }
        }
    }

    // ------------------ Core: liquidity ops ------------------

    function addLiquidity(uint256 amount0, uint256 amount1, uint256 minLpOut) external returns (uint256 lpOut) {
        require(amount0 > 0 && amount1 > 0, "add: zero amount");
        // transfer in
        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);

        // scale
        uint256 dx = _scaleTo1e18(amount0, decimals0);
        uint256 dy = _scaleTo1e18(amount1, decimals1);

        uint256 _x = x;
        uint256 _y = y;

        uint256 D0 = _getD(_x, _y, A);
        uint256 D1 = _getD(_x + dx, _y + dy, A);

        if (lp.totalSupply() == 0) {
            // bootstrap: mint LP equal to D1
            lpOut = D1;
        } else {
            // proportion to increase in D
            lpOut = (lp.totalSupply() * (D1 - D0)) / D0;
        }
        require(lpOut >= minLpOut, "add: slippage");

        // update reserves
        x = _x + dx;
        y = _y + dy;

        // mint LP
        LPToken(address(lp)).mint(msg.sender, lpOut);

        emit AddLiquidity(msg.sender, amount0, amount1, lpOut);
    }

    function removeLiquidity(uint256 lpAmount, uint256 min0, uint256 min1) external returns (uint256 amt0, uint256 amt1) {
        require(lpAmount > 0, "remove: zero amount");
        uint256 supply = lp.totalSupply();
        require(supply > 0, "remove: empty");

        // burn first to prevent reentrancy issues around state
        LPToken(address(lp)).burn(msg.sender, lpAmount);

        // pro-rata
        uint256 _x = x;
        uint256 _y = y;

        uint256 dx = (_x * lpAmount) / supply;
        uint256 dy = (_y * lpAmount) / supply;

        x = _x - dx;
        y = _y - dy;

        amt0 = _unscaleFrom1e18(dx, decimals0);
        amt1 = _unscaleFrom1e18(dy, decimals1);

        require(amt0 >= min0 && amt1 >= min1, "remove: slippage");

        token0.safeTransfer(msg.sender, amt0);
        token1.safeTransfer(msg.sender, amt1);

        emit RemoveLiquidity(msg.sender, lpAmount, amt0, amt1);
    }

    // ------------------ Core: swap ------------------

    /**
     * @notice Swap exact tokens. zeroForOne=true swaps token0->token1.
     * @param amountIn amount of input token in its native decimals
     * @param minAmountOut minimum acceptable out
     */
    function swap(bool zeroForOne, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut) {
        require(amountIn > 0, "swap: zero in");

        if (zeroForOne) {
            token0.safeTransferFrom(msg.sender, address(this), amountIn);
            uint256 dx = _scaleTo1e18(amountIn, decimals0);

            // compute dy before fee
            uint256 D = _getD(x, y, A);
            uint256 xNew = x + dx;
            uint256 yNew = _getY(xNew, D, A);
            require(yNew < y, "swap: no out");

            uint256 dy = y - yNew;
            // fees
            uint256 fee = (dy * feeBps) / BPS;
            uint256 dyOut = dy - fee;

            // update reserves
            x = xNew;
            y = yNew + fee; // fee stays in pool to LPs

            amountOut = _unscaleFrom1e18(dyOut, decimals1);
            require(amountOut >= minAmountOut, "swap: slippage");

            token1.safeTransfer(msg.sender, amountOut);
            emit Swap(msg.sender, amountIn, true, amountOut);
        } else {
            token1.safeTransferFrom(msg.sender, address(this), amountIn);
            uint256 dy = _scaleTo1e18(amountIn, decimals1);

            uint256 D = _getD(x, y, A);
            uint256 yNew = y + dy;
            uint256 xNew = _getY(yNew, D, A);
            require(xNew < x, "swap: no out");

            uint256 dx = x - xNew;
            uint256 fee = (dx * feeBps) / BPS;
            uint256 dxOut = dx - fee;

            x = xNew + fee;
            y = yNew;

            amountOut = _unscaleFrom1e18(dxOut, decimals0);
            require(amountOut >= minAmountOut, "swap: slippage");

            token0.safeTransfer(msg.sender, amountOut);
            emit Swap(msg.sender, amountIn, false, amountOut);
        }
    }

    // ------------------ Admin params ------------------

    function setParams(uint256 _A, uint256 _feeBps, uint256 _adminFeeBps) external onlyOwner {
        require(_A > 0, "A=0");
        require(_feeBps < 1000, "fee too high"); // <10%
        require(_adminFeeBps <= 5000, "adminFee too high");
        A = _A;
        feeBps = _feeBps;
        adminFeeBps = _adminFeeBps;
        emit SetParams(_A, _feeBps, _adminFeeBps);
    }
}
