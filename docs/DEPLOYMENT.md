# StableSwap Arc Network - Deployment Guide

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Hardhat
- Access to target network RPC
- Sufficient native tokens for gas

## Environment Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:

```env
# Network RPC URLs
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
TESTNET_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY

# Deployer Private Key (DO NOT COMMIT!)
PRIVATE_KEY=0x...

# Contract Verification
ETHERSCAN_API_KEY=YOUR_API_KEY

# Deployment Configuration
TREASURY_ADDRESS=0x...
SALARY_ADDRESS=0x...
AMPLIFICATION_FACTOR=100
SWAP_FEE_BPS=4
```

### 3. Configure Networks

In `hardhat.config.js`:

```javascript
networks: {
  mainnet: {
    url: process.env.MAINNET_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
    chainId: 1,
  },
  sepolia: {
    url: process.env.TESTNET_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
    chainId: 11155111,
  },
}
```

## Deployment Order

Contracts must be deployed in this specific order due to dependencies:

```
1. Mock Tokens (testnet only)
     ↓
2. ASSToken
     ↓
3. FeeDistributor
     ↓
4. StakingContract
     ↓
5. AutoBuyback
     ↓
6. StableSwapPool
     ↓
7. Router
     ↓
8. TimeLock
     ↓
9. MultiSigWallet
     ↓
10. Multicall
     ↓
11. Configuration & Integration
```

## Deployment Scripts

### Deploy Script

Create `scripts/deploy.js`:

```javascript
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Configuration
  const treasury = process.env.TREASURY_ADDRESS;
  const salaryAddress = process.env.SALARY_ADDRESS;
  const A = 100; // Amplification factor
  const feeBps = 4; // 0.04% fee

  // Step 1: Deploy mock tokens (testnet only)
  console.log("\n1. Deploying Mock Tokens...");
  const MockToken = await ethers.getContractFactory("MockERC20");
  const usdc = await MockToken.deploy("USD Coin", "USDC", 6);
  const usdt = await MockToken.deploy("Tether", "USDT", 6);
  await usdc.waitForDeployment();
  await usdt.waitForDeployment();
  console.log("USDC:", await usdc.getAddress());
  console.log("USDT:", await usdt.getAddress());

  // Step 2: Deploy ASSToken
  console.log("\n2. Deploying ASSToken...");
  const ASSToken = await ethers.getContractFactory("ASSToken");
  const assToken = await ASSToken.deploy();
  await assToken.waitForDeployment();
  console.log("ASSToken:", await assToken.getAddress());

  // Step 3: Deploy FeeDistributor
  console.log("\n3. Deploying FeeDistributor...");
  const FeeDistributor = await ethers.getContractFactory("FeeDistributor");
  const feeDistributor = await FeeDistributor.deploy(
    await assToken.getAddress(),
    treasury,
    salaryAddress,
    await usdc.getAddress()
  );
  await feeDistributor.waitForDeployment();
  console.log("FeeDistributor:", await feeDistributor.getAddress());

  // Step 4: Deploy StakingContract
  console.log("\n4. Deploying StakingContract...");
  const StakingContract = await ethers.getContractFactory("StakingContract");
  const stakingContract = await StakingContract.deploy(
    await assToken.getAddress(),
    await feeDistributor.getAddress(),
    await usdc.getAddress()
  );
  await stakingContract.waitForDeployment();
  console.log("StakingContract:", await stakingContract.getAddress());

  // Step 5: Deploy AutoBuyback
  console.log("\n5. Deploying AutoBuyback...");
  const AutoBuyback = await ethers.getContractFactory("AutoBuyback");
  const autoBuyback = await AutoBuyback.deploy(
    await assToken.getAddress(),
    await feeDistributor.getAddress(),
    await usdc.getAddress(),
    salaryAddress
  );
  await autoBuyback.waitForDeployment();
  console.log("AutoBuyback:", await autoBuyback.getAddress());

  // Step 6: Deploy StableSwapPool
  console.log("\n6. Deploying StableSwapPool...");
  const StableSwapPool = await ethers.getContractFactory("StableSwapPool");
  const pool = await StableSwapPool.deploy(
    await usdc.getAddress(),
    await usdt.getAddress(),
    6,  // USDC decimals
    6,  // USDT decimals
    A,
    feeBps,
    deployer.address
  );
  await pool.waitForDeployment();
  console.log("StableSwapPool:", await pool.getAddress());

  // Step 7: Deploy Router
  console.log("\n7. Deploying Router...");
  const Router = await ethers.getContractFactory("Router");
  const router = await Router.deploy();
  await router.waitForDeployment();
  console.log("Router:", await router.getAddress());

  // Step 8: Deploy TimeLock
  console.log("\n8. Deploying TimeLock...");
  const TimeLock = await ethers.getContractFactory("TimeLock");
  const timeLock = await TimeLock.deploy(3600); // 1 hour delay
  await timeLock.waitForDeployment();
  console.log("TimeLock:", await timeLock.getAddress());

  // Step 9: Deploy MultiSigWallet
  console.log("\n9. Deploying MultiSigWallet...");
  const owners = [deployer.address]; // Add more owners for production
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const multiSig = await MultiSigWallet.deploy(owners, 1);
  await multiSig.waitForDeployment();
  console.log("MultiSigWallet:", await multiSig.getAddress());

  // Step 10: Deploy Multicall
  console.log("\n10. Deploying Multicall...");
  const Multicall = await ethers.getContractFactory("Multicall");
  const multicall = await Multicall.deploy();
  await multicall.waitForDeployment();
  console.log("Multicall:", await multicall.getAddress());

  // Step 11: Configure contracts
  console.log("\n11. Configuring contracts...");

  // Set FeeDistributor in ASSToken
  await assToken.setFeeDistributor(await feeDistributor.getAddress());
  console.log("- ASSToken.setFeeDistributor done");

  // Set StakingContract in FeeDistributor
  await feeDistributor.setStakingContract(await stakingContract.getAddress());
  console.log("- FeeDistributor.setStakingContract done");

  // Set AutoBuyback in FeeDistributor
  await feeDistributor.setAutoBuyback(await autoBuyback.getAddress());
  console.log("- FeeDistributor.setAutoBuyback done");

  // Add pool to FeeDistributor
  await feeDistributor.addSwapContract(await pool.getAddress());
  console.log("- FeeDistributor.addSwapContract done");

  console.log("\n=== Deployment Complete ===");
  console.log("\nContract Addresses:");
  console.log({
    ASSToken: await assToken.getAddress(),
    FeeDistributor: await feeDistributor.getAddress(),
    StakingContract: await stakingContract.getAddress(),
    AutoBuyback: await autoBuyback.getAddress(),
    StableSwapPool: await pool.getAddress(),
    Router: await router.getAddress(),
    TimeLock: await timeLock.getAddress(),
    MultiSigWallet: await multiSig.getAddress(),
    Multicall: await multicall.getAddress(),
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Run Deployment

```bash
# Testnet
npx hardhat run scripts/deploy.js --network sepolia

# Mainnet
npx hardhat run scripts/deploy.js --network mainnet
```

## Post-Deployment Checklist

### 1. Verify Contracts

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### 2. Security Configuration

```bash
# Transfer ownership to MultiSig
await assToken.transferOwnership(multiSigAddress);
await feeDistributor.transferOwnership(multiSigAddress);
await stakingContract.transferOwnership(multiSigAddress);
await pool.transferOwnership(multiSigAddress);
```

### 3. Add Liquidity

```javascript
// Approve tokens
await usdc.approve(routerAddress, amount);
await usdt.approve(routerAddress, amount);

// Add initial liquidity
await router.addLiquidity(poolAddress, amount0, amount1, 0);
```

### 4. Configure Frontend

Update `frontend/src/config.js`:

```javascript
export const config = {
  contracts: {
    stableSwapPool: "0x...",
    router: "0x...",
    assToken: "0x...",
    feeDistributor: "0x...",
    stakingContract: "0x...",
    multicall: "0x...",
  },
  network: {
    chainId: 1,
    rpcUrl: "https://...",
  },
};
```

## Upgrade Procedures

### Using TimeLock

```javascript
// 1. Queue transaction
const eta = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
await timeLock.queueTransaction(
  targetAddress,
  0,
  "setFee(uint256)",
  ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [10]),
  eta
);

// 2. Wait for delay...

// 3. Execute
await timeLock.executeTransaction(
  targetAddress,
  0,
  "setFee(uint256)",
  ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [10]),
  eta
);
```

### Using MultiSig

```javascript
// 1. Submit transaction
const data = pool.interface.encodeFunctionData("setParams", [100, 5, 0]);
await multiSig.submitTransaction(poolAddress, 0, data);

// 2. Other owners confirm
await multiSig.connect(owner2).confirmTransaction(txIndex);

// 3. Execute
await multiSig.executeTransaction(txIndex);
```

## Monitoring

### Key Metrics to Monitor

1. **Pool Health**
   - Reserve ratios
   - Total value locked (TVL)
   - Daily volume

2. **Fee Distribution**
   - Fees collected
   - Fees distributed
   - Staker rewards

3. **Buyback Stats**
   - Total burned
   - Pending buyback
   - Next buyback time

### Event Monitoring

```javascript
// Listen for swaps
pool.on("Swap", (trader, amountIn, zeroForOne, amountOut) => {
  console.log(`Swap: ${trader} swapped ${amountIn} for ${amountOut}`);
});

// Listen for fee distribution
feeDistributor.on("FeesDistributed", (staker, buyback, treasury) => {
  console.log(`Fees distributed: Staker=${staker}, Buyback=${buyback}`);
});
```

## Troubleshooting

### Common Issues

1. **"flash loan protection"**
   - User trying to perform multiple operations in same block
   - Solution: Wait for next block

2. **"exceeds max swap limit"**
   - Swap amount > 10% of reserves
   - Solution: Split into smaller swaps

3. **"tx not ready" (TimeLock)**
   - ETA not reached
   - Solution: Wait until ETA

4. **"not enough confirmations" (MultiSig)**
   - Insufficient owner confirmations
   - Solution: Get more owners to confirm

## Security Recommendations

1. **Multi-Sig for Ownership**: Transfer all contract ownership to MultiSig
2. **TimeLock for Critical Changes**: Use TimeLock for parameter changes
3. **Monitor Events**: Set up alerting for unusual activity
4. **Regular Audits**: Schedule periodic security reviews
5. **Bug Bounty**: Consider launching a bug bounty program

---

*Deployment guide for StableSwap Arc Network v1.0*
