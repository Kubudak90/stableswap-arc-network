const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  // Contract addresses (USDY'yi önce deploy etmemiz gerekiyor)
  const testUSDC = "0x53646C53e712cE320182E289E7364d4d0e4D6D01";
  const testUSDT = "0x2587521Ca49A69813991E9076B6eFbBb5CbfD19E";
  
  // TestUSDY address - önce deploy-3pool.cjs çalıştırılmalı
  let testUSDY;
  try {
    const addresses = require('./3pool-addresses.json');
    testUSDY = addresses.testUSDY;
    console.log("Using existing TestUSDY:", testUSDY);
  } catch {
    console.log("Deploying TestUSDY first...");
    const USDY = await hre.ethers.getContractFactory("TestUSDY");
    const usdyContract = await USDY.deploy();
    await usdyContract.waitForDeployment();
    testUSDY = await usdyContract.getAddress();
    console.log("TestUSDY deployed to:", testUSDY);
  }

  console.log("\n=== Deploying TestTokenFaucetV2 ===");
  
  const FaucetV2 = await hre.ethers.getContractFactory("TestTokenFaucetV2");
  const faucetV2 = await FaucetV2.deploy(testUSDC, testUSDT, testUSDY);
  await faucetV2.waitForDeployment();
  console.log("TestTokenFaucetV2 deployed to:", await faucetV2.getAddress());

  // Refill faucet with tokens
  console.log("\n=== Refilling Faucet V2 ===");
  const refillAmount = hre.ethers.parseUnits("100000", 6); // 100K tokens
  
  const usdcContract = new hre.ethers.Contract(testUSDC, [
    "function transfer(address to, uint256 amount) returns (bool)"
  ], deployer);
  
  const usdtContract = new hre.ethers.Contract(testUSDT, [
    "function transfer(address to, uint256 amount) returns (bool)"
  ], deployer);
  
  const usdyContract = new hre.ethers.Contract(testUSDY, [
    "function transfer(address to, uint256 amount) returns (bool)"
  ], deployer);

  // Transfer tokens to faucet
  await usdcContract.transfer(await faucetV2.getAddress(), refillAmount);
  await usdtContract.transfer(await faucetV2.getAddress(), refillAmount);
  await usdyContract.transfer(await faucetV2.getAddress(), refillAmount);
  
  console.log("✅ Faucet V2 refilled with 100K tokens each");

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("TestTokenFaucetV2:", await faucetV2.getAddress());
  console.log("TestUSDC:", testUSDC);
  console.log("TestUSDT:", testUSDT);
  console.log("TestUSDY:", testUSDY);

  // Save addresses
  const addresses = {
    faucetV2: await faucetV2.getAddress(),
    testUSDC: testUSDC,
    testUSDT: testUSDT,
    testUSDY: testUSDY,
    network: hre.network.name
  };

  const fs = require('fs');
  fs.writeFileSync('./faucet-v2-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\nFaucet V2 addresses saved to faucet-v2-addresses.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
