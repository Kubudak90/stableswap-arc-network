// scripts/deploy-lp-pools.js
// Deploy StableSwapPool and StableSwap3PoolLP with LP token support
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // Existing token addresses (already deployed)
  const TOKENS = {
    tUSDC: "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733",
    tUSDT: "0x787804d1f98F4Da65C6de63AaA00906A8C6868F3",
    tUSDY: "0x4D81e87902aA4Cf67D99055D44b6D0341fCc419a"
  };

  // Existing LiquidityRewards contract
  const LIQUIDITY_REWARDS = "0x05B4c54211D577295FBE52E9E84EED0F5F6bEC66";

  console.log("\n=== Using Existing Tokens ===");
  console.log("tUSDC:", TOKENS.tUSDC);
  console.log("tUSDT:", TOKENS.tUSDT);
  console.log("tUSDY:", TOKENS.tUSDY);

  // Deploy 2Pool with LP tokens
  console.log("\n=== Deploying StableSwapPool (2Pool with LP) ===");

  const StableSwapPool = await hre.ethers.getContractFactory("StableSwapPool");
  const pool2 = await StableSwapPool.deploy(
    TOKENS.tUSDC,    // token0
    TOKENS.tUSDT,    // token1
    6,               // decimals0
    6,               // decimals1
    100,             // A (amplification)
    4,               // feeBps (0.04%)
    deployer.address // LP token owner
  );
  await pool2.waitForDeployment();
  const pool2Address = await pool2.getAddress();
  const lp2Address = await pool2.lp();
  console.log("StableSwapPool (2Pool) deployed to:", pool2Address);
  console.log("LP Token (2Pool) deployed to:", lp2Address);

  // Deploy 3Pool with LP tokens
  console.log("\n=== Deploying StableSwap3PoolLP (3Pool with LP) ===");

  const StableSwap3PoolLP = await hre.ethers.getContractFactory("StableSwap3PoolLP");
  const pool3 = await StableSwap3PoolLP.deploy(
    TOKENS.tUSDC,    // token0
    TOKENS.tUSDT,    // token1
    TOKENS.tUSDY,    // token2
    6,               // decimals0
    6,               // decimals1
    6,               // decimals2
    4,               // feeBps (0.04%)
    deployer.address // LP token owner
  );
  await pool3.waitForDeployment();
  const pool3Address = await pool3.getAddress();
  const lp3Address = await pool3.lp();
  console.log("StableSwap3PoolLP (3Pool) deployed to:", pool3Address);
  console.log("LP Token (3Pool) deployed to:", lp3Address);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("\n2Pool (USDC-USDT):");
  console.log("  Pool Address:", pool2Address);
  console.log("  LP Token:", lp2Address);
  console.log("\n3Pool (USDC-USDT-USDY):");
  console.log("  Pool Address:", pool3Address);
  console.log("  LP Token:", lp3Address);

  console.log("\n" + "=".repeat(60));
  console.log("FRONTEND CONFIG UPDATE");
  console.log("=".repeat(60));
  console.log(`
Update frontend/src/config.js:

  swap: '${pool2Address}',
  swap3Pool: '${pool3Address}',
  lp2Pool: '${lp2Address}',
  lp3Pool: '${lp3Address}',
`);

  console.log("\n" + "=".repeat(60));
  console.log("LIQUIDITY REWARDS SETUP");
  console.log("=".repeat(60));
  console.log(`
To enable LP farming, add pools to LiquidityRewards contract:

1. Call addPool for 2Pool LP:
   - lpToken: ${lp2Address}
   - allocPoint: 100 (adjust as needed)

2. Call addPool for 3Pool LP:
   - lpToken: ${lp3Address}
   - allocPoint: 150 (adjust as needed)

LiquidityRewards address: ${LIQUIDITY_REWARDS}
`);

  // Save addresses to file
  const addresses = {
    network: hre.network.name,
    deployer: deployer.address,
    tokens: TOKENS,
    pools: {
      pool2: {
        address: pool2Address,
        lpToken: lp2Address
      },
      pool3: {
        address: pool3Address,
        lpToken: lp3Address
      }
    },
    liquidityRewards: LIQUIDITY_REWARDS
  };

  const fs = require('fs');
  fs.writeFileSync('./deployed-lp-pools.json', JSON.stringify(addresses, null, 2));
  console.log("\nAddresses saved to deployed-lp-pools.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
