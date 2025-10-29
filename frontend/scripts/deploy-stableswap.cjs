const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Contract addresses
  const testUSDC = "0x53646C53e712cE320182E289E7364d4d0e4D6D01";
  const testUSDT = "0x2587521Ca49A69813991E9076B6eFbBb5CbfD19E";

  console.log("\n=== Deploying StableSwap ===");
  
  const StableSwap = await hre.ethers.getContractFactory("StableSwap");
  const stableSwap = await StableSwap.deploy(testUSDC, testUSDT);
  await stableSwap.waitForDeployment();
  console.log("StableSwap deployed to:", await stableSwap.getAddress());

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("StableSwap:", await stableSwap.getAddress());
  console.log("TestUSDC:", testUSDC);
  console.log("TestUSDT:", testUSDT);

  // Save addresses
  const addresses = {
    stableSwap: await stableSwap.getAddress(),
    testUSDC: testUSDC,
    testUSDT: testUSDT,
    network: hre.network.name
  };

  const fs = require('fs');
  fs.writeFileSync('./stableswap-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\nStableSwap addresses saved to stableswap-addresses.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
