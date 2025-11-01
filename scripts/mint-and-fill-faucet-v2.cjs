const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  const faucetV2 = "0xd23bC9993699bAFa31fc626619ad73c43E032588";
  
  // Deploy mintable tokens
  console.log("\n=== Deploying Mintable Test Tokens ===");
  
  const TestUSDCV2 = await hre.ethers.getContractFactory("TestUSDCV2");
  const testUSDCV2 = await TestUSDCV2.deploy();
  await testUSDCV2.waitForDeployment();
  const testUSDCV2Address = await testUSDCV2.getAddress();
  console.log("TestUSDCV2 deployed to:", testUSDCV2Address);
  
  const TestUSDTV2 = await hre.ethers.getContractFactory("TestUSDTV2");
  const testUSDTV2 = await TestUSDTV2.deploy();
  await testUSDTV2.waitForDeployment();
  const testUSDTV2Address = await testUSDTV2.getAddress();
  console.log("TestUSDTV2 deployed to:", testUSDTV2Address);
  
  const TestUSDYV2 = await hre.ethers.getContractFactory("TestUSDYV2");
  const testUSDYV2 = await TestUSDYV2.deploy();
  await testUSDYV2.waitForDeployment();
  const testUSDYV2Address = await testUSDYV2.getAddress();
  console.log("TestUSDYV2 deployed to:", testUSDYV2Address);

  // Mint 5M tokens to faucet
  console.log("\n=== Minting 5M tokens to Faucet V2 ===");
  const mintAmount = hre.ethers.parseUnits("5000000", 6); // 5M tokens
  
  const mintUSDC = await testUSDCV2.mint(faucetV2, mintAmount);
  await mintUSDC.wait();
  console.log("✅ 5M tUSDC minted to faucet");
  
  const mintUSDT = await testUSDTV2.mint(faucetV2, mintAmount);
  await mintUSDT.wait();
  console.log("✅ 5M tUSDT minted to faucet");
  
  const mintUSDY = await testUSDYV2.mint(faucetV2, mintAmount);
  await mintUSDY.wait();
  console.log("✅ 5M tUSDY minted to faucet");

  // Check balances
  const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];
  
  const usdcContract = new hre.ethers.Contract(testUSDCV2Address, ERC20_ABI);
  const usdtContract = new hre.ethers.Contract(testUSDTV2Address, ERC20_ABI);
  const usdyContract = new hre.ethers.Contract(testUSDYV2Address, ERC20_ABI);

  const faucetUSDC = await usdcContract.balanceOf(faucetV2);
  const faucetUSDT = await usdtContract.balanceOf(faucetV2);
  const faucetUSDY = await usdyContract.balanceOf(faucetV2);
  
  console.log("\n=== Faucet V2 Final Balances (New Tokens) ===");
  console.log("tUSDC:", hre.ethers.formatUnits(faucetUSDC, 6));
  console.log("tUSDT:", hre.ethers.formatUnits(faucetUSDT, 6));
  console.log("tUSDY:", hre.ethers.formatUnits(faucetUSDY, 6));

  // Save addresses
  const addresses = {
    testUSDCV2: testUSDCV2Address,
    testUSDTV2: testUSDTV2Address,
    testUSDYV2: testUSDYV2Address,
    faucetV2: faucetV2,
    network: hre.network.name
  };

  fs.writeFileSync('./mintable-tokens-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\n✅ Mintable token addresses saved to mintable-tokens-addresses.json");
  console.log("\n⚠️  NOT: Yeni token kontratları deploy edildi. Eğer eski kontratları kullanmaya devam edecekseniz,");
  console.log("    eski kontratlara mint yetkisi ekleyemeyiz (immutable).");
  console.log("    Frontend'i yeni adreslerle güncellemeniz gerekebilir.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
