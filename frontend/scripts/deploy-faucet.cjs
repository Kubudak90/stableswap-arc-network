const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Contract addresses
  const testUSDC = "0x53646C53e712cE320182E289E7364d4d0e4D6D01";
  const testUSDT = "0x2587521Ca49A69813991E9076B6eFbBb5CbfD19E";

  console.log("\n=== Deploying TestTokenFaucet ===");
  
  const Faucet = await hre.ethers.getContractFactory("TestTokenFaucet");
  const faucet = await Faucet.deploy(testUSDC, testUSDT);
  await faucet.waitForDeployment();
  console.log("TestTokenFaucet deployed to:", await faucet.getAddress());

  // Refill faucet with tokens
  console.log("\n=== Refilling Faucet ===");
  const refillAmount = hre.ethers.parseUnits("100000", 6); // 100K tokens
  
  // Approve faucet to spend tokens
  const usdcContract = new hre.ethers.Contract(testUSDC, [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)"
  ], deployer);
  
  const usdtContract = new hre.ethers.Contract(testUSDT, [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)"
  ], deployer);

  // Transfer tokens to faucet
  await usdcContract.transfer(await faucet.getAddress(), refillAmount);
  await usdtContract.transfer(await faucet.getAddress(), refillAmount);
  
  console.log("✅ Faucet refilled with 100K tokens each");

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("TestTokenFaucet:", await faucet.getAddress());
  console.log("TestUSDC:", testUSDC);
  console.log("TestUSDT:", testUSDT);

  // Save addresses
  const addresses = {
    faucet: await faucet.getAddress(),
    testUSDC: testUSDC,
    testUSDT: testUSDT,
    network: hre.network.name
  };

  const fs = require('fs');
  fs.writeFileSync('./faucet-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\nFaucet addresses saved to faucet-addresses.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
