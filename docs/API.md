# StableSwap Arc Network - API Documentation

## Overview

This document provides comprehensive API documentation for all smart contracts in the StableSwap Arc Network protocol.

## Table of Contents

1. [StableSwapPool](#stableswappool)
2. [Router](#router)
3. [ASSToken](#asstoken)
4. [FeeDistributor](#feedistributor)
5. [StakingContract](#stakingcontract)
6. [AutoBuyback](#autobuyback)
7. [TimeLock](#timelock)
8. [MultiSigWallet](#multisigwallet)
9. [Multicall](#multicall)

---

## StableSwapPool

Curve-style StableSwap AMM for low-slippage stablecoin swaps.

### State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `token0` | `IERC20` | First token in the pool |
| `token1` | `IERC20` | Second token in the pool |
| `x` | `uint256` | Reserve of token0 (scaled to 1e18) |
| `y` | `uint256` | Reserve of token1 (scaled to 1e18) |
| `A` | `uint256` | Amplification coefficient |
| `feeBps` | `uint256` | Swap fee in basis points |
| `lp` | `LPToken` | LP token contract |
| `flashLoanProtectionEnabled` | `bool` | Flash loan protection status |
| `maxSwapPercentage` | `uint256` | Max single swap as % of reserves |

### Functions

#### `addLiquidity`
```solidity
function addLiquidity(
    uint256 amount0,
    uint256 amount1,
    uint256 minLpOut
) external returns (uint256 lpOut)
```
Adds liquidity to the pool.

**Parameters:**
- `amount0`: Amount of token0 to add
- `amount1`: Amount of token1 to add
- `minLpOut`: Minimum LP tokens to receive (slippage protection)

**Returns:** `lpOut` - Amount of LP tokens minted

**Events:** `AddLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpMinted)`

---

#### `removeLiquidity`
```solidity
function removeLiquidity(
    uint256 lpAmount,
    uint256 min0,
    uint256 min1
) external returns (uint256 amt0, uint256 amt1)
```
Removes liquidity from the pool.

**Parameters:**
- `lpAmount`: Amount of LP tokens to burn
- `min0`: Minimum token0 to receive
- `min1`: Minimum token1 to receive

**Returns:** `amt0`, `amt1` - Amounts of tokens received

**Events:** `RemoveLiquidity(address indexed provider, uint256 lpBurned, uint256 amount0, uint256 amount1)`

---

#### `swap`
```solidity
function swap(
    bool zeroForOne,
    uint256 amountIn,
    uint256 minAmountOut
) external returns (uint256 amountOut)
```
Swaps tokens.

**Parameters:**
- `zeroForOne`: Direction (true: token0→token1, false: token1→token0)
- `amountIn`: Amount of input token
- `minAmountOut`: Minimum output (slippage protection)

**Returns:** `amountOut` - Amount of output token received

**Events:** `Swap(address indexed trader, uint256 amountIn, bool zeroForOne, uint256 amountOut)`

---

#### `getReserves`
```solidity
function getReserves() external view returns (uint256 reserve0, uint256 reserve1)
```
Returns current reserves in native decimals.

---

## Router

Helper contract for user-friendly interactions with StableSwapPool.

### Functions

#### `addLiquidity`
```solidity
function addLiquidity(
    address pool,
    uint256 amount0,
    uint256 amount1,
    uint256 minLpOut
) external returns (uint256 lpOut)
```
Adds liquidity through the router.

---

#### `removeLiquidity`
```solidity
function removeLiquidity(
    address pool,
    uint256 lpAmount,
    uint256 min0,
    uint256 min1
) external returns (uint256 amt0, uint256 amt1)
```
Removes liquidity through the router.

---

#### `swapExactTokensForTokens`
```solidity
function swapExactTokensForTokens(
    address pool,
    bool zeroForOne,
    uint256 amountIn,
    uint256 minAmountOut
) external returns (uint256 amountOut)
```
Executes a swap through the router.

---

## ASSToken

Arc Stable Swap governance token.

### State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `feeDistributor` | `address` | Authorized minter |
| `liquidityRewards` | `address` | Authorized minter |
| `stakingContract` | `address` | Staking integration |

### Functions

#### `mint`
```solidity
function mint(address to, uint256 amount) external
```
Mints new tokens. Only callable by `feeDistributor` or `liquidityRewards`.

---

#### `burn`
```solidity
function burn(uint256 amount) external
```
Burns tokens from caller's balance. (Inherited from ERC20Burnable)

---

#### `setFeeDistributor`
```solidity
function setFeeDistributor(address _feeDistributor) external onlyOwner
```
Sets the fee distributor address.

---

## FeeDistributor

Collects and distributes swap fees.

### Fee Distribution

| Recipient | Share |
|-----------|-------|
| Stakers | 45% |
| Buyback | 45% |
| Treasury | 10% |

### Functions

#### `collectFee`
```solidity
function collectFee(address token, uint256 amount) external
```
Collects fees from swap contracts. Only callable by registered swap contracts.

---

#### `distributeFees`
```solidity
function distributeFees(address token) external
```
Distributes collected fees to stakers, buyback, and treasury.

---

#### `addSwapContract`
```solidity
function addSwapContract(address swapContract) external onlyOwner
```
Registers a swap contract for fee collection.

---

## StakingContract

Stake ASS tokens to earn stablecoin rewards.

### Functions

#### `stake`
```solidity
function stake(uint256 amount) external
```
Stakes ASS tokens.

**Events:** `Staked(address indexed user, uint256 amount)`

---

#### `unstake`
```solidity
function unstake(uint256 amount) external
```
Unstakes ASS tokens.

**Events:** `Unstaked(address indexed user, uint256 amount)`

---

#### `claimRewards`
```solidity
function claimRewards() external
```
Claims pending stablecoin rewards.

**Events:** `RewardClaimed(address indexed user, uint256 amount)`

---

#### `getStakerInfo`
```solidity
function getStakerInfo(address user) external view returns (
    uint256 stakedAmount,
    uint256 pendingRewards,
    uint256 totalStakedInContract
)
```
Returns staking information for a user.

---

## AutoBuyback

Automated buyback and burn mechanism.

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `BUYBACK_INTERVAL` | 6 hours | Time between buybacks |
| `SALARY_PERCENTAGE` | 10% | Portion to salary |
| `BURN_PERCENTAGE` | 90% | Portion to burn |

### Functions

#### `executeBuyback`
```solidity
function executeBuyback() external
```
Executes scheduled buyback. Can be called by anyone (keeper bot).

---

#### `canExecuteBuyback`
```solidity
function canExecuteBuyback() external view returns (bool)
```
Checks if buyback can be executed.

---

#### `getStats`
```solidity
function getStats() external view returns (
    uint256 totalBuybackAmount,
    uint256 totalBurned,
    uint256 totalSalaryPaid,
    uint256 buybackCount,
    uint256 nextBuybackTime,
    uint256 pendingBuyback
)
```
Returns buyback statistics.

---

## TimeLock

Time-delayed execution for admin operations.

### Constants

| Constant | Value |
|----------|-------|
| `MIN_DELAY` | 1 hour |
| `MAX_DELAY` | 30 days |
| `GRACE_PERIOD` | 14 days |

### Functions

#### `queueTransaction`
```solidity
function queueTransaction(
    address target,
    uint256 value,
    string memory signature,
    bytes memory data,
    uint256 eta
) external onlyOwner returns (bytes32)
```
Queues a transaction for later execution.

---

#### `executeTransaction`
```solidity
function executeTransaction(
    address target,
    uint256 value,
    string memory signature,
    bytes memory data,
    uint256 eta
) external payable onlyExecutor returns (bytes memory)
```
Executes a queued transaction after delay.

---

#### `cancelTransaction`
```solidity
function cancelTransaction(
    address target,
    uint256 value,
    string memory signature,
    bytes memory data,
    uint256 eta
) external onlyOwner
```
Cancels a queued transaction.

---

## MultiSigWallet

Multi-signature wallet for critical operations.

### Functions

#### `submitTransaction`
```solidity
function submitTransaction(
    address _to,
    uint256 _value,
    bytes memory _data
) public onlyOwner returns (uint256)
```
Submits a new transaction. Auto-confirms for submitter.

---

#### `confirmTransaction`
```solidity
function confirmTransaction(uint256 _txIndex) public onlyOwner
```
Confirms a pending transaction.

---

#### `executeTransaction`
```solidity
function executeTransaction(uint256 _txIndex) public onlyOwner
```
Executes a confirmed transaction.

---

#### `revokeConfirmation`
```solidity
function revokeConfirmation(uint256 _txIndex) public onlyOwner
```
Revokes a previous confirmation.

---

## Multicall

Batch multiple calls in a single transaction.

### Functions

#### `aggregate`
```solidity
function aggregate(Call[] calldata calls) external returns (
    uint256 blockNumber,
    bytes[] memory returnData
)
```
Aggregates multiple calls. Reverts if any call fails.

---

#### `tryAggregate`
```solidity
function tryAggregate(bool requireSuccess, Call[] calldata calls) external returns (
    Result[] memory returnData
)
```
Aggregates with optional failure tolerance.

---

#### `aggregate3Value`
```solidity
function aggregate3Value(Call3Value[] calldata calls) external payable returns (
    Result[] memory returnData
)
```
Aggregates calls with ETH value support.

---

## Error Codes

| Error | Contract | Description |
|-------|----------|-------------|
| `pool: flash loan protection` | StableSwapPool | Same-block operation blocked |
| `swap: exceeds max swap limit` | StableSwapPool | Swap amount too large |
| `swap: slippage` | StableSwapPool | Output below minimum |
| `MultiSig: not owner` | MultiSigWallet | Caller not an owner |
| `TimeLock: tx not ready` | TimeLock | ETA not reached |
| `TimeLock: tx stale` | TimeLock | Grace period expired |

---

## Events Reference

### StableSwapPool
- `AddLiquidity(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpMinted)`
- `RemoveLiquidity(address indexed provider, uint256 lpBurned, uint256 amount0, uint256 amount1)`
- `Swap(address indexed trader, uint256 amountIn, bool zeroForOne, uint256 amountOut)`

### FeeDistributor
- `FeesCollected(address indexed swapContract, address indexed token, uint256 amount)`
- `FeesDistributed(uint256 stakerAmount, uint256 buybackAmount, uint256 treasuryAmount, uint256 salaryAmount, uint256 burnAmount)`

### StakingContract
- `Staked(address indexed user, uint256 amount)`
- `Unstaked(address indexed user, uint256 amount)`
- `RewardClaimed(address indexed user, uint256 amount)`

### AutoBuyback
- `BuybackExecuted(uint256 buybackAmount, uint256 assPurchased, uint256 burned, uint256 salaryPaid, uint256 timestamp)`

---

*Documentation generated for StableSwap Arc Network v1.0*
