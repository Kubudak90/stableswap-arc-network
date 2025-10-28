// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)));

  // Deploy test tokens first
  console.log("\n=== Deploying Test Tokens ===");
  
  const TestUSDC = await hre.ethers.getContractFactory("TestUSDC");
  const testUSDC = await TestUSDC.deploy();
  await testUSDC.waitForDeployment();
  console.log("TestUSDC deployed to:", await testUSDC.getAddress());

  const TestUSDT = await hre.ethers.getContractFactory("TestUSDT");
  const testUSDT = await TestUSDT.deploy();
  await testUSDT.waitForDeployment();
  console.log("TestUSDT deployed to:", await testUSDT.getAddress());

  // Deploy StableSwap Pool
  console.log("\n=== Deploying StableSwap Pool ===");
  
  const token0 = await testUSDC.getAddress();
  const token1 = await testUSDT.getAddress();
  const dec0 = 6;  // USDC decimals
  const dec1 = 6;  // USDT decimals
  const A = 100;   // amplification parameter
  const feeBps = 4; // 0.04% fee

  const StableSwap = await hre.ethers.getContractFactory("StableSwapPool");
  const pool = await StableSwap.deploy(
    token0, 
    token1, 
    dec0, 
    dec1, 
    A, 
    feeBps, 
    deployer.address
  );
  await pool.waitForDeployment();
  console.log("StableSwapPool deployed to:", await pool.getAddress());

  // Deploy Router
  console.log("\n=== Deploying Router ===");
  
  const Router = await hre.ethers.getContractFactory("Router");
  const router = await Router.deploy();
  await router.waitForDeployment();
  console.log("Router deployed to:", await router.getAddress());

  const lpAddr = await pool.lp();
  console.log("LPToken deployed to:", lpAddr);

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("TestUSDC:", await testUSDC.getAddress());
  console.log("TestUSDT:", await testUSDT.getAddress());
  console.log("StableSwapPool:", await pool.getAddress());
  console.log("Router:", await router.getAddress());
  console.log("LPToken:", lpAddr);

  // Save addresses to file for frontend
  const addresses = {
    testUSDC: await testUSDC.getAddress(),
    testUSDT: await testUSDT.getAddress(),
    pool: await pool.getAddress(),
    router: await router.getAddress(),
    lpToken: lpAddr,
    network: hre.network.name
  };

  const fs = require('fs');
  fs.writeFileSync('./deployed-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\nAddresses saved to deployed-addresses.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});