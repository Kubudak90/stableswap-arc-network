// scripts/setup-v2-pools.js
// Register V2 pools in FeeDistributor and add LP tokens to LiquidityRewards
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Setting up with:", deployer.address);

  // New V2 Pool addresses (from deployment)
  const POOL_2V2 = "0xB19eb9Cf58e5F55091798996F18351b71Cbc1a01";
  const POOL_3V2 = "0x312858D2935a89512bB4C614e23c5E3d09ba4cB0";
  const LP_2POOL_V2 = "0xA1162d71D509Fe5F1C65725Be44cAA705e9DDe23";
  const LP_3POOL_V2 = "0x9c27A4c32Eca2Dc5873E149D7c73cb0342d2F9F5";

  // Contract addresses
  const FEE_DISTRIBUTOR = "0x9d5EC576F616Dc30CB8e743a6D5334F376ff8D58";
  const LIQUIDITY_REWARDS = "0x05B4c54211D577295FBE52E9E84EED0F5F6bEC66";

  // Connect to FeeDistributor
  const feeDistributor = await hre.ethers.getContractAt(
    [
      "function addSwapContract(address swapContract) external",
      "function isSwapContract(address contractAddress) view returns (bool)",
      "function getSwapContracts() view returns (address[])",
      "function owner() view returns (address)"
    ],
    FEE_DISTRIBUTOR,
    deployer
  );

  console.log("\n=== Checking FeeDistributor ===");
  const fdOwner = await feeDistributor.owner();
  console.log("FeeDistributor Owner:", fdOwner);

  // Check current swap contracts
  const currentSwaps = await feeDistributor.getSwapContracts();
  console.log("Current registered swaps:", currentSwaps);

  // Register V2 pools in FeeDistributor
  console.log("\n=== Registering V2 Pools in FeeDistributor ===");

  const is2PoolRegistered = await feeDistributor.isSwapContract(POOL_2V2);
  if (!is2PoolRegistered) {
    console.log("Registering 2Pool V2...");
    try {
      const tx1 = await feeDistributor.addSwapContract(POOL_2V2);
      await tx1.wait();
      console.log("✅ 2Pool V2 registered");
    } catch (e) {
      console.log("❌ Failed to register 2Pool V2:", e.message);
    }
  } else {
    console.log("2Pool V2 already registered");
  }

  const is3PoolRegistered = await feeDistributor.isSwapContract(POOL_3V2);
  if (!is3PoolRegistered) {
    console.log("Registering 3Pool V2...");
    try {
      const tx2 = await feeDistributor.addSwapContract(POOL_3V2);
      await tx2.wait();
      console.log("✅ 3Pool V2 registered");
    } catch (e) {
      console.log("❌ Failed to register 3Pool V2:", e.message);
    }
  } else {
    console.log("3Pool V2 already registered");
  }

  // Connect to LiquidityRewards
  const liquidityRewards = await hre.ethers.getContractAt(
    [
      "function addPool(address poolContract, uint256 allocPoint) external",
      "function poolInfo(uint256) view returns (address poolContract, uint256 allocPoint, uint256 lastRewardTime, uint256 accRewardPerShare, bool isActive)",
      "function totalAllocPoint() view returns (uint256)",
      "function owner() view returns (address)"
    ],
    LIQUIDITY_REWARDS,
    deployer
  );

  console.log("\n=== Checking LiquidityRewards ===");
  const lrOwner = await liquidityRewards.owner();
  console.log("LiquidityRewards Owner:", lrOwner);

  // Check existing pools
  console.log("\nExisting pools:");
  let poolCount = 0;
  try {
    while (true) {
      const pool = await liquidityRewards.poolInfo(poolCount);
      console.log(`Pool ${poolCount}: ${pool.poolContract} (alloc: ${pool.allocPoint}, active: ${pool.isActive})`);
      poolCount++;
    }
  } catch (e) {
    console.log(`Total pools: ${poolCount}`);
  }

  // Add V2 LP tokens to LiquidityRewards
  console.log("\n=== Adding V2 LP Tokens to LiquidityRewards ===");

  console.log("Adding 2Pool V2 LP (100 alloc points)...");
  try {
    const tx3 = await liquidityRewards.addPool(LP_2POOL_V2, 100);
    await tx3.wait();
    console.log("✅ 2Pool V2 LP added");
  } catch (e) {
    console.log("❌ Failed:", e.message);
  }

  console.log("Adding 3Pool V2 LP (150 alloc points)...");
  try {
    const tx4 = await liquidityRewards.addPool(LP_3POOL_V2, 150);
    await tx4.wait();
    console.log("✅ 3Pool V2 LP added");
  } catch (e) {
    console.log("❌ Failed:", e.message);
  }

  // Verify
  console.log("\n=== Verification ===");
  const newSwaps = await feeDistributor.getSwapContracts();
  console.log("Registered swap contracts:", newSwaps);

  const totalAlloc = await liquidityRewards.totalAllocPoint();
  console.log("Total allocation points:", totalAlloc.toString());

  console.log("\n=== Setup Complete ===");
  console.log("V2 Pools can now:");
  console.log("1. Collect admin fees via collectFees()");
  console.log("2. Fees sent to FeeDistributor for distribution");
  console.log("3. LP token holders can stake in LiquidityRewards for ASS");
  console.log("\nPool IDs for frontend:");
  console.log(`  2Pool V2 LP: Pool ID ${poolCount}`);
  console.log(`  3Pool V2 LP: Pool ID ${poolCount + 1}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
