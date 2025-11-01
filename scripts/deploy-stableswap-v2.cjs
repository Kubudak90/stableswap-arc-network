const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  // Token addresses (mintable tokens)
  const testUSDC = "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733";
  const testUSDT = "0x787804d1f98F4Da65C6de63AaA00906A8C6868F3";

  console.log("\n=== Deploying StableSwap V2 (with removeLiquidity) ===");
  
  // Deploy new StableSwap with removeLiquidity
  console.log("\n--- Deploying StableSwap V2 ---");
  const StableSwap = await hre.ethers.getContractFactory("StableSwap");
  const stableSwap = await StableSwap.deploy(testUSDC, testUSDT);
  await stableSwap.waitForDeployment();
  const stableSwapAddress = await stableSwap.getAddress();
  console.log("StableSwap V2 deployed to:", stableSwapAddress);

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("StableSwap V2 (2Pool):", stableSwapAddress);
  console.log("\nTokens:");
  console.log("  TestUSDCV2:", testUSDC);
  console.log("  TestUSDTV2:", testUSDT);

  // Save addresses
  const addresses = {
    stableSwapV2: stableSwapAddress,
    testUSDC: testUSDC,
    testUSDT: testUSDT,
    network: hre.network.name
  };

  fs.writeFileSync('./stableswap-v2-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\n✅ Addresses saved to stableswap-v2-addresses.json");
  console.log("\n⚠️  NOT: Eski StableSwap kontratı:", "0xC8B54F9085FCA8F45cc461002A8bd381D1240a47");
  console.log("    Yeni StableSwap kontratı:", stableSwapAddress);
  console.log("\n    Frontend'de adresi güncelleyin!");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

