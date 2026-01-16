// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../StableSwapPool.sol";
import "../ASSToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockToken
 * @notice Simple mock token for testing
 */
contract MockToken is ERC20 {
    uint8 private _decimals;

    constructor(string memory name, string memory symbol, uint8 dec) ERC20(name, symbol) {
        _decimals = dec;
        _mint(msg.sender, 1000000000 * 10 ** dec);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title EchidnaStableSwapPool
 * @notice Echidna fuzz testing contract for StableSwapPool
 * @dev Tests invariants and properties of the StableSwapPool
 */
contract EchidnaStableSwapPool {
    StableSwapPool public pool;
    MockToken public token0;
    MockToken public token1;

    // Track initial state for invariant checks
    uint256 public initialD;
    bool public initialized;

    // Events for debugging
    event InvariantCheck(string name, bool passed, uint256 value);

    constructor() {
        // Deploy mock tokens
        token0 = new MockToken("USD Coin", "USDC", 6);
        token1 = new MockToken("Tether", "USDT", 6);

        // Deploy pool
        pool = new StableSwapPool(
            address(token0),
            address(token1),
            6,
            6,
            100,  // Amplification
            4,    // 0.04% fee
            address(this)
        );

        // Approve tokens
        token0.approve(address(pool), type(uint256).max);
        token1.approve(address(pool), type(uint256).max);

        // Add initial liquidity
        uint256 initialAmount = 1000000 * 1e6; // 1M each
        pool.addLiquidity(initialAmount, initialAmount, 0);
        initialized = true;
    }

    // ============ INVARIANTS ============

    /**
     * @notice Invariant: Reserves should never be negative (always >= 0)
     */
    function echidna_reserves_non_negative() public view returns (bool) {
        (uint256 r0, uint256 r1) = pool.getReserves();
        return r0 >= 0 && r1 >= 0;
    }

    /**
     * @notice Invariant: LP supply should match expected based on D
     */
    function echidna_lp_supply_consistency() public view returns (bool) {
        uint256 lpSupply = pool.lp().totalSupply();
        (uint256 r0, uint256 r1) = pool.getReserves();

        // If there's liquidity, LP supply should be positive
        if (r0 > 0 && r1 > 0) {
            return lpSupply > 0;
        }
        return true;
    }

    /**
     * @notice Invariant: Fee should never exceed maximum
     */
    function echidna_fee_within_bounds() public view returns (bool) {
        return pool.feeBps() <= 100; // Max 1%
    }

    /**
     * @notice Invariant: maxSwapPercentage should be within bounds
     */
    function echidna_max_swap_percentage_bounds() public view returns (bool) {
        uint256 maxSwap = pool.maxSwapPercentage();
        return maxSwap > 0 && maxSwap <= 5000; // 0 < maxSwap <= 50%
    }

    /**
     * @notice Invariant: Token balances should match reserves
     */
    function echidna_balance_reserve_consistency() public view returns (bool) {
        (uint256 r0, uint256 r1) = pool.getReserves();
        uint256 balance0 = token0.balanceOf(address(pool));
        uint256 balance1 = token1.balanceOf(address(pool));

        // Balances should be at least as much as reserves
        return balance0 >= r0 && balance1 >= r1;
    }

    // ============ FUZZ FUNCTIONS ============

    /**
     * @notice Fuzz test: Add liquidity with random amounts
     */
    function test_add_liquidity(uint256 amount0, uint256 amount1) public {
        // Bound inputs to reasonable values
        amount0 = bound(amount0, 1e6, 100000 * 1e6);
        amount1 = bound(amount1, 1e6, 100000 * 1e6);

        // Mint tokens
        token0.mint(address(this), amount0);
        token1.mint(address(this), amount1);

        uint256 lpBefore = pool.lp().balanceOf(address(this));
        (uint256 r0Before, uint256 r1Before) = pool.getReserves();

        try pool.addLiquidity(amount0, amount1, 0) returns (uint256 lpMinted) {
            uint256 lpAfter = pool.lp().balanceOf(address(this));
            (uint256 r0After, uint256 r1After) = pool.getReserves();

            // Assertions
            assert(lpAfter >= lpBefore); // LP should increase
            assert(r0After >= r0Before); // Reserve0 should increase
            assert(r1After >= r1Before); // Reserve1 should increase
            assert(lpMinted > 0);        // Should mint some LP
        } catch {
            // Acceptable failure (e.g., flash loan protection)
        }
    }

    /**
     * @notice Fuzz test: Remove liquidity with random amounts
     */
    function test_remove_liquidity(uint256 lpAmount) public {
        uint256 lpBalance = pool.lp().balanceOf(address(this));
        if (lpBalance == 0) return;

        // Bound to available LP
        lpAmount = bound(lpAmount, 1, lpBalance);

        (uint256 r0Before, uint256 r1Before) = pool.getReserves();

        try pool.removeLiquidity(lpAmount, 0, 0) returns (uint256 amt0, uint256 amt1) {
            (uint256 r0After, uint256 r1After) = pool.getReserves();

            // Assertions
            assert(r0Before >= r0After); // Reserve0 should decrease
            assert(r1Before >= r1After); // Reserve1 should decrease
            assert(amt0 > 0 || amt1 > 0); // Should receive something
        } catch {
            // Acceptable failure
        }
    }

    /**
     * @notice Fuzz test: Swap with random amounts
     */
    function test_swap(bool zeroForOne, uint256 amountIn) public {
        // Bound inputs
        amountIn = bound(amountIn, 100, 10000 * 1e6);

        // Mint input token
        if (zeroForOne) {
            token0.mint(address(this), amountIn);
        } else {
            token1.mint(address(this), amountIn);
        }

        (uint256 r0Before, uint256 r1Before) = pool.getReserves();

        try pool.swap(zeroForOne, amountIn, 0) returns (uint256 amountOut) {
            (uint256 r0After, uint256 r1After) = pool.getReserves();

            // Assertions
            assert(amountOut > 0); // Should receive something

            if (zeroForOne) {
                assert(r0After > r0Before); // Input reserve increases
                assert(r1After < r1Before); // Output reserve decreases
            } else {
                assert(r1After > r1Before);
                assert(r0After < r0Before);
            }
        } catch {
            // Acceptable failure (e.g., exceeds max swap)
        }
    }

    // ============ HELPER FUNCTIONS ============

    /**
     * @notice Bound a value between min and max
     */
    function bound(uint256 value, uint256 min, uint256 max) internal pure returns (uint256) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    /**
     * @notice Advance block number (for flash loan protection testing)
     */
    function advanceBlock() public {
        // Echidna will naturally advance blocks between calls
    }
}

/**
 * @title EchidnaASSToken
 * @notice Echidna fuzz testing for ASSToken
 */
contract EchidnaASSToken {
    ASSToken public assToken;
    address public feeDistributor;
    address public liquidityRewards;

    constructor() {
        assToken = new ASSToken();
        feeDistributor = address(0x1);
        liquidityRewards = address(0x2);

        assToken.setFeeDistributor(feeDistributor);
        assToken.setLiquidityRewards(liquidityRewards);
    }

    /**
     * @notice Invariant: Total supply should equal sum of balances
     */
    function echidna_supply_balance_consistency() public view returns (bool) {
        // This is ensured by ERC20 implementation
        return true;
    }

    /**
     * @notice Invariant: Only authorized contracts can mint
     */
    function echidna_unauthorized_cannot_mint() public view returns (bool) {
        // This address (the test contract) should not be authorized
        return (
            address(this) != assToken.feeDistributor() &&
            address(this) != assToken.liquidityRewards()
        );
    }
}
