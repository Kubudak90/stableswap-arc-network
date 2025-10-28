const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Deploy new test tokens
  const TestUSDC = await hre.ethers.getContractFactory("TestUSDC");
  const testUSDC = await TestUSDC.deploy();
  await testUSDC.waitForDeployment();
  console.log("TestUSDC deployed to:", await testUSDC.getAddress());

  const TestUSDT = await hre.ethers.getContractFactory("TestUSDT");
  const testUSDT = await TestUSDT.deploy();
  await testUSDT.waitForDeployment();
  console.log("TestUSDT deployed to:", await testUSDT.getAddress());

  console.log("\n=== Token Balances ===");
  const balanceUSDC = await testUSDC.balanceOf(deployer.address);
  const balanceUSDT = await testUSDT.balanceOf(deployer.address);
  
  console.log("tUSDC Balance:", hre.ethers.formatUnits(balanceUSDC, 6));
  console.log("tUSDT Balance:", hre.ethers.formatUnits(balanceUSDT, 6));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
