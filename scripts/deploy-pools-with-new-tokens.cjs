const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  // New mintable token addresses
  const testUSDC = "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733";
  const testUSDT = "0x787804d1f98F4Da65C6de63AaA00906A8C6868F3";
  const testUSDY = "0x4D81e87902aA4Cf67D99055D44b6D0341fCc419a";

  console.log("\n=== Deploying New Pools with Mintable Tokens ===");
  
  // Deploy 2Pool
  console.log("\n--- Deploying StableSwap (2Pool) ---");
  const StableSwap = await hre.ethers.getContractFactory("StableSwap");
  const stableSwap = await StableSwap.deploy(testUSDC, testUSDT);
  await stableSwap.waitForDeployment();
  const stableSwapAddress = await stableSwap.getAddress();
  console.log("StableSwap deployed to:", stableSwapAddress);

  // Deploy 3Pool
  console.log("\n--- Deploying StableSwap3Pool (3Pool) ---");
  const StableSwap3Pool = await hre.ethers.getContractFactory("StableSwap3Pool");
  const stableSwap3Pool = await StableSwap3Pool.deploy(testUSDC, testUSDT, testUSDY);
  await stableSwap3Pool.waitForDeployment();
  const stableSwap3PoolAddress = await stableSwap3Pool.getAddress();
  console.log("StableSwap3Pool deployed to:", stableSwap3PoolAddress);

  // Deploy Faucet V2 with new tokens
  console.log("\n--- Deploying TestTokenFaucetV2 with New Tokens ---");
  const FaucetV2 = await hre.ethers.getContractFactory("TestTokenFaucetV2");
  const faucetV2 = await FaucetV2.deploy(testUSDC, testUSDT, testUSDY);
  await faucetV2.waitForDeployment();
  const faucetV2Address = await faucetV2.getAddress();
  console.log("TestTokenFaucetV2 deployed to:", faucetV2Address);

  // Mint tokens to faucet
  console.log("\n--- Minting 5M tokens to Faucet ---");
  const mintAmount = hre.ethers.parseUnits("5000000", 6);
  
  const TestUSDCV2 = await hre.ethers.getContractFactory("TestUSDCV2");
  const TestUSDTV2 = await hre.ethers.getContractFactory("TestUSDTV2");
  const TestUSDYV2 = await hre.ethers.getContractFactory("TestUSDYV2");
  
  const usdcContract = TestUSDCV2.attach(testUSDC);
  const usdtContract = TestUSDTV2.attach(testUSDT);
  const usdyContract = TestUSDYV2.attach(testUSDY);
  
  await usdcContract.mint(faucetV2Address, mintAmount);
  await usdtContract.mint(faucetV2Address, mintAmount);
  await usdyContract.mint(faucetV2Address, mintAmount);
  console.log("✅ 5M tokens minted to faucet");

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("StableSwap (2Pool):", stableSwapAddress);
  console.log("StableSwap3Pool (3Pool):", stableSwap3PoolAddress);
  console.log("TestTokenFaucetV2:", faucetV2Address);
  console.log("\nTokens:");
  console.log("  TestUSDCV2:", testUSDC);
  console.log("  TestUSDTV2:", testUSDT);
  console.log("  TestUSDYV2:", testUSDY);

  // Save addresses
  const addresses = {
    stableSwap: stableSwapAddress,
    stableSwap3Pool: stableSwap3PoolAddress,
    faucetV2: faucetV2Address,
    testUSDC: testUSDC,
    testUSDT: testUSDT,
    testUSDY: testUSDY,
    network: hre.network.name
  };

  fs.writeFileSync('./new-contracts-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\n✅ Addresses saved to new-contracts-addresses.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
