// scripts/add-lp-pools-to-rewards.js
// Add LP tokens to LiquidityRewards contract for farming
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // LP Token addresses (from deployment)
  const LP_2POOL = "0x1820ACA410eBe240D8138A1b39a6b3f018BCf3Ae";
  const LP_3POOL = "0xCe3aAA43db2e5953e2E06D928e3277277A73a65b";

  // LiquidityRewards contract address
  const LIQUIDITY_REWARDS = "0x05B4c54211D577295FBE52E9E84EED0F5F6bEC66";

  // Connect to LiquidityRewards contract
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

  console.log("\n=== Checking LiquidityRewards Contract ===");
  const owner = await liquidityRewards.owner();
  console.log("Contract Owner:", owner);
  console.log("Deployer:", deployer.address);

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("\n⚠️  WARNING: Deployer is not the owner of LiquidityRewards contract!");
    console.log("Cannot add pools. Please use the owner account.");
    return;
  }

  // Check existing pools
  console.log("\n=== Checking Existing Pools ===");
  let poolCount = 0;
  try {
    while (true) {
      const pool = await liquidityRewards.poolInfo(poolCount);
      console.log(`Pool ${poolCount}: ${pool.poolContract} (allocPoint: ${pool.allocPoint})`);
      poolCount++;
    }
  } catch (e) {
    console.log(`Total existing pools: ${poolCount}`);
  }

  // Add 2Pool LP
  console.log("\n=== Adding 2Pool LP Token ===");
  console.log("LP Token Address:", LP_2POOL);
  console.log("Allocation Points: 100");

  try {
    const tx1 = await liquidityRewards.addPool(LP_2POOL, 100);
    await tx1.wait();
    console.log("✅ 2Pool LP added successfully!");
    console.log("Transaction:", tx1.hash);
  } catch (e) {
    console.log("❌ Failed to add 2Pool LP:", e.message);
  }

  // Add 3Pool LP
  console.log("\n=== Adding 3Pool LP Token ===");
  console.log("LP Token Address:", LP_3POOL);
  console.log("Allocation Points: 150");

  try {
    const tx2 = await liquidityRewards.addPool(LP_3POOL, 150);
    await tx2.wait();
    console.log("✅ 3Pool LP added successfully!");
    console.log("Transaction:", tx2.hash);
  } catch (e) {
    console.log("❌ Failed to add 3Pool LP:", e.message);
  }

  // Verify pools added
  console.log("\n=== Verifying Pools ===");
  const totalAlloc = await liquidityRewards.totalAllocPoint();
  console.log("Total Allocation Points:", totalAlloc.toString());

  try {
    const pool0 = await liquidityRewards.poolInfo(poolCount);
    console.log(`Pool ${poolCount} (2Pool LP): ${pool0.poolContract}`);
    console.log(`  - Allocation: ${pool0.allocPoint}`);
    console.log(`  - Active: ${pool0.isActive}`);
  } catch (e) {
    console.log("Pool 0 not found");
  }

  try {
    const pool1 = await liquidityRewards.poolInfo(poolCount + 1);
    console.log(`Pool ${poolCount + 1} (3Pool LP): ${pool1.poolContract}`);
    console.log(`  - Allocation: ${pool1.allocPoint}`);
    console.log(`  - Active: ${pool1.isActive}`);
  } catch (e) {
    console.log("Pool 1 not found");
  }

  console.log("\n=== Done! ===");
  console.log("Users can now stake LP tokens to earn ASS rewards!");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
