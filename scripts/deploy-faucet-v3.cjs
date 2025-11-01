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

  // Contract addresses
  const testUSDC = "0x53646C53e712cE320182E289E7364d4d0e4D6D01";
  const testUSDT = "0x2587521Ca49A69813991E9076B6eFbBb5CbfD19E";
  const testUSDY = "0x54D12437404aD9a4E7506C4497711b21CCE3ABCd";

  console.log("\n=== Deploying TestTokenFaucetV3 ===");
  
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

  // Refill faucet with tokens
  console.log("\n=== Refilling Faucet V3 ===");
  const refillAmount = hre.ethers.parseUnits("100000", 6); // 100K tokens
  
  const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)"
  ];

  const usdcContract = new hre.ethers.Contract(testUSDC, ERC20_ABI, deployer);
  const usdtContract = new hre.ethers.Contract(testUSDT, ERC20_ABI, deployer);
  const usdyContract = new hre.ethers.Contract(testUSDY, ERC20_ABI, deployer);

  // Transfer tokens to faucet
  await usdcContract.transfer(faucetV3Address, refillAmount);
  await usdtContract.transfer(faucetV3Address, refillAmount);
  await usdyContract.transfer(faucetV3Address, refillAmount);
  
  console.log("✅ Faucet V3 refilled with 100K tokens each");

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("TestTokenFaucetV3:", faucetV3Address);
  console.log("Developer:", developerAddress);
  console.log("TestUSDC:", testUSDC);
  console.log("TestUSDT:", testUSDT);
  console.log("TestUSDY:", testUSDY);

  // Save addresses
  const addresses = {
    faucetV3: faucetV3Address,
    developer: developerAddress,
    testUSDC: testUSDC,
    testUSDT: testUSDT,
    testUSDY: testUSDY,
    network: hre.network.name
  };

  fs.writeFileSync('./faucet-v3-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\nFaucet V3 addresses saved to faucet-v3-addresses.json");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
