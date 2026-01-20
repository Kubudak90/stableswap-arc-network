// scripts/deploy-liquidity-rewards-v2.js
// Deploy updated LiquidityRewards contract with proper LP token handling
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Contract addresses
  const ASS_TOKEN = "0xe56151c58780ebB54e32257B3426a6Bc15e46C3C";

  // V2 LP Token addresses
  const LP_2POOL_V2 = "0xA1162d71D509Fe5F1C65725Be44cAA705e9DDe23";
  const LP_3POOL_V2 = "0x9c27A4c32Eca2Dc5873E149D7c73cb0342d2F9F5";

  console.log("\n=== Deploying LiquidityRewards V2 ===");
  const LiquidityRewards = await hre.ethers.getContractFactory("LiquidityRewards");
  const liquidityRewards = await LiquidityRewards.deploy(ASS_TOKEN);
  await liquidityRewards.waitForDeployment();
  const lrAddress = await liquidityRewards.getAddress();
  console.log("LiquidityRewards V2 deployed to:", lrAddress);

  // Add V2 LP pools
  console.log("\n=== Adding V2 LP Pools ===");

  console.log("Adding 2Pool V2 LP (100 alloc points)...");
  const tx1 = await liquidityRewards.addPool(LP_2POOL_V2, 100);
  await tx1.wait();
  console.log("2Pool V2 LP added (Pool ID: 0)");

  console.log("Adding 3Pool V2 LP (150 alloc points)...");
  const tx2 = await liquidityRewards.addPool(LP_3POOL_V2, 150);
  await tx2.wait();
  console.log("3Pool V2 LP added (Pool ID: 1)");

  // Grant MINTER_ROLE to LiquidityRewards on ASSToken
  console.log("\n=== Granting MINTER_ROLE ===");
  const assToken = await hre.ethers.getContractAt(
    ["function grantRole(bytes32 role, address account) external",
     "function MINTER_ROLE() view returns (bytes32)"],
    ASS_TOKEN,
    deployer
  );

  const MINTER_ROLE = await assToken.MINTER_ROLE();
  console.log("MINTER_ROLE:", MINTER_ROLE);

  try {
    const tx3 = await assToken.grantRole(MINTER_ROLE, lrAddress);
    await tx3.wait();
    console.log("MINTER_ROLE granted to LiquidityRewards");
  } catch (e) {
    console.log("Could not grant MINTER_ROLE (may already have it or not admin):", e.message);
  }

  console.log("\n=== Deployment Summary ===");
  console.log("LiquidityRewards V2:", lrAddress);
  console.log("  - Pool 0: 2Pool V2 LP (", LP_2POOL_V2, ")");
  console.log("  - Pool 1: 3Pool V2 LP (", LP_3POOL_V2, ")");
  console.log("  - Reward Token:", ASS_TOKEN);

  // Check reward rate
  const rewardPerSecond = await liquidityRewards.rewardPerSecond();
  console.log("  - Reward per second:", hre.ethers.formatUnits(rewardPerSecond, 18), "ASS");
  console.log("  - Reward per day:", hre.ethers.formatUnits(rewardPerSecond * 86400n, 18), "ASS");

  console.log("\n=== Update config.js ===");
  console.log(`  liquidityRewards: '${lrAddress}',`);
  console.log("\n=== Update PoolCard.jsx pool IDs ===");
  console.log("  2Pool V2: poolId: 0");
  console.log("  3Pool V2: poolId: 1");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
