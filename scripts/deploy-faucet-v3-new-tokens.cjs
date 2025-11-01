const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  const developerAddress = "0x1D58328205429D39cE21a13DcD3FeB73180C9B20";
  
  console.log("Deployer:", deployer.address);
  console.log("Developer Address:", developerAddress);

  // New mintable token addresses
  const testUSDC = "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733";
  const testUSDT = "0x787804d1f98F4Da65C6de63AaA00906A8C6868F3";
  const testUSDY = "0x4D81e87902aA4Cf67D99055D44b6D0341fCc419a";

  console.log("\n=== Deploying TestTokenFaucetV3 with New Tokens ===");
  
  const FaucetV3 = await hre.ethers.getContractFactory("TestTokenFaucetV3");
  const faucetV3 = await FaucetV3.deploy(testUSDC, testUSDT, testUSDY);
  await faucetV3.waitForDeployment();
  const faucetV3Address = await faucetV3.getAddress();
  console.log("TestTokenFaucetV3 deployed to:", faucetV3Address);

  // Add developer
  console.log("\n=== Adding Developer ===");
  const addDevTx = await faucetV3.addDeveloper(developerAddress);
  await addDevTx.wait();
  console.log("✅ Developer added:", developerAddress);

  // Mint tokens directly to faucet
  console.log("\n=== Minting 5M tokens to Faucet V3 ===");
  const mintAmount = hre.ethers.parseUnits("5000000", 6);
  
  const TestUSDCV2 = await hre.ethers.getContractFactory("TestUSDCV2");
  const TestUSDTV2 = await hre.ethers.getContractFactory("TestUSDTV2");
  const TestUSDYV2 = await hre.ethers.getContractFactory("TestUSDYV2");
  
  const usdcContract = TestUSDCV2.attach(testUSDC);
  const usdtContract = TestUSDTV2.attach(testUSDT);
  const usdyContract = TestUSDYV2.attach(testUSDY);
  
  await usdcContract.mint(faucetV3Address, mintAmount);
  await usdtContract.mint(faucetV3Address, mintAmount);
  await usdyContract.mint(faucetV3Address, mintAmount);
  console.log("✅ 5M tokens minted to faucet");

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("TestTokenFaucetV3:", faucetV3Address);
  console.log("Developer:", developerAddress);
  console.log("\nTokens:");
  console.log("  TestUSDCV2:", testUSDC);
  console.log("  TestUSDTV2:", testUSDT);
  console.log("  TestUSDYV2:", testUSDY);

  // Save addresses
  const addresses = {
    faucetV3: faucetV3Address,
    developer: developerAddress,
    testUSDC: testUSDC,
    testUSDT: testUSDT,
    testUSDY: testUSDY,
    network: hre.network.name
  };

  fs.writeFileSync('./faucet-v3-new-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\n✅ Addresses saved to faucet-v3-new-addresses.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
