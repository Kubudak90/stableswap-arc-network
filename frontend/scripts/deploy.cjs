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

  // Deploy SimpleSwap
  console.log("\n=== Deploying SimpleSwap ===");
  
  const token0 = await testUSDC.getAddress();
  const token1 = await testUSDT.getAddress();

  const SimpleSwap = await hre.ethers.getContractFactory("SimpleSwap");
  const swap = await SimpleSwap.deploy(token0, token1);
  await swap.waitForDeployment();
  console.log("SimpleSwap deployed to:", await swap.getAddress());

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("TestUSDC:", await testUSDC.getAddress());
  console.log("TestUSDT:", await testUSDT.getAddress());
  console.log("SimpleSwap:", await swap.getAddress());

  // Save addresses to file for frontend
  const addresses = {
    testUSDC: await testUSDC.getAddress(),
    testUSDT: await testUSDT.getAddress(),
    swap: await swap.getAddress(),
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
