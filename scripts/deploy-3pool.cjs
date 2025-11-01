const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  // Contract addresses
  const testUSDC = "0x53646C53e712cE320182E289E7364d4d0e4D6D01";
  const testUSDT = "0x2587521Ca49A69813991E9076B6eFbBb5CbfD19E";

  console.log("\n=== Deploying TestUSDY ===");
  const USDY = await hre.ethers.getContractFactory("TestUSDY");
  const testUSDY = await USDY.deploy();
  await testUSDY.waitForDeployment();
  console.log("TestUSDY deployed to:", await testUSDY.getAddress());

  console.log("\n=== Deploying StableSwap3Pool ===");
  const StableSwap3Pool = await hre.ethers.getContractFactory("StableSwap3Pool");
  const pool3 = await StableSwap3Pool.deploy(testUSDC, testUSDT, await testUSDY.getAddress());
  await pool3.waitForDeployment();
  console.log("StableSwap3Pool deployed to:", await pool3.getAddress());

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("StableSwap3Pool:", await pool3.getAddress());
  console.log("TestUSDC:", testUSDC);
  console.log("TestUSDT:", testUSDT);
  console.log("TestUSDY:", await testUSDY.getAddress());

  // Save addresses
  const addresses = {
    stableSwap3Pool: await pool3.getAddress(),
    testUSDC: testUSDC,
    testUSDT: testUSDT,
    testUSDY: await testUSDY.getAddress(),
    network: hre.network.name
  };

  const fs = require('fs');
  fs.writeFileSync('./3pool-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\n3Pool addresses saved to 3pool-addresses.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
