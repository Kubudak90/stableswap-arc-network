// scripts/deploy-v2-pools.js
// Deploy StableSwapPoolV2 and StableSwap3PoolV2 with FeeDistributor integration
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Existing token addresses
  const testUSDC = "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733";
  const testUSDT = "0x787804d1f98F4Da65C6de63AaA00906A8C6868F3";
  const testUSDY = "0x4D81e87902aA4Cf67D99055D44b6D0341fCc419a";

  // Fee distribution addresses
  const feeDistributor = "0x9d5EC576F616Dc30CB8e743a6D5334F376ff8D58";

  // Parameters
  const A = 100; // Amplification coefficient
  const feeBps = 4; // 0.04% total fee
  const adminFeeBps = 5000; // 50% of fees go to FeeDistributor (stakers, buyback, treasury)

  console.log("\n=== Deploying StableSwapPoolV2 (2Pool with Fee Distribution) ===");
  const StableSwapPoolV2 = await hre.ethers.getContractFactory("StableSwapPoolV2");
  const pool2 = await StableSwapPoolV2.deploy(
    testUSDC,           // token0
    testUSDT,           // token1
    6,                  // decimals0
    6,                  // decimals1
    A,                  // amplification
    feeBps,             // total fee
    adminFeeBps,        // admin fee share
    feeDistributor,     // fee distributor address
    deployer.address    // LP token owner
  );
  await pool2.waitForDeployment();
  const pool2Addr = await pool2.getAddress();
  console.log("StableSwapPoolV2 deployed to:", pool2Addr);

  // Get LP token address
  const lp2Addr = await pool2.lp();
  console.log("2Pool LP Token:", lp2Addr);

  console.log("\n=== Deploying StableSwap3PoolV2 (3Pool with Fee Distribution) ===");
  const StableSwap3PoolV2 = await hre.ethers.getContractFactory("StableSwap3PoolV2");
  const pool3 = await StableSwap3PoolV2.deploy(
    testUSDC,           // token0
    testUSDT,           // token1
    testUSDY,           // token2
    6,                  // decimals0
    6,                  // decimals1
    6,                  // decimals2
    feeBps,             // total fee
    adminFeeBps,        // admin fee share
    feeDistributor,     // fee distributor address
    deployer.address    // LP token owner
  );
  await pool3.waitForDeployment();
  const pool3Addr = await pool3.getAddress();
  console.log("StableSwap3PoolV2 deployed to:", pool3Addr);

  // Get LP token address
  const lp3Addr = await pool3.lp();
  console.log("3Pool LP Token:", lp3Addr);

  console.log("\n=== Deployment Summary ===");
  console.log("StableSwapPoolV2 (2Pool):", pool2Addr);
  console.log("  - LP Token:", lp2Addr);
  console.log("  - Fee:", feeBps, "bps (0.04%)");
  console.log("  - Admin Fee Share:", adminFeeBps, "bps (50%)");
  console.log("StableSwap3PoolV2 (3Pool):", pool3Addr);
  console.log("  - LP Token:", lp3Addr);
  console.log("  - Fee:", feeBps, "bps (0.04%)");
  console.log("  - Admin Fee Share:", adminFeeBps, "bps (50%)");
  console.log("FeeDistributor:", feeDistributor);

  console.log("\n=== Fee Distribution Flow ===");
  console.log("1. 50% of swap fees stay in pool for LP holders");
  console.log("2. 50% of swap fees collected for FeeDistributor");
  console.log("3. FeeDistributor splits: 45% stakers, 45% buyback, 10% treasury");
  console.log("4. Call collectFees() on pools to send fees to FeeDistributor");

  console.log("\n=== Next Steps ===");
  console.log("1. Register these pools in FeeDistributor");
  console.log("2. Add LP tokens to LiquidityRewards for ASS farming");
  console.log("3. Update frontend config.js with new addresses");
  console.log("\nUpdate config.js with:");
  console.log(`  swap: '${pool2Addr}',`);
  console.log(`  swap3Pool: '${pool3Addr}',`);
  console.log(`  lp2Pool: '${lp2Addr}',`);
  console.log(`  lp3Pool: '${lp3Addr}',`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
