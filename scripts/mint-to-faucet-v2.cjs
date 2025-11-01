const hre = require("hardhat");

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

  // Mint 5M tokens to deployer first, then transfer to faucet
  console.log("\n=== Minting 5M tokens ===");
  const mintAmount = hre.ethers.parseUnits("5000000", 6); // 5M tokens
  
  console.log("Minting to deployer...");
  await testUSDCV2.mint(deployer.address, mintAmount);
  await testUSDTV2.mint(deployer.address, mintAmount);
  await testUSDYV2.mint(deployer.address, mintAmount);
  console.log("✅ 5M tokens minted to deployer");

  // Transfer to faucet V2
  console.log("\n=== Transferring to Faucet V2 ===");
  const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)"
  ];
  
  const usdcContract = new hre.ethers.Contract(testUSDCV2Address, ERC20_ABI, deployer);
  const usdtContract = new hre.ethers.Contract(testUSDTV2Address, ERC20_ABI, deployer);
  const usdyContract = new hre.ethers.Contract(testUSDYV2Address, ERC20_ABI, deployer);

  await usdcContract.transfer(faucetV2, mintAmount);
  await usdtContract.transfer(faucetV2, mintAmount);
  await usdyContract.transfer(faucetV2, mintAmount);
  console.log("✅ 5M tokens transferred to Faucet V2");

  // Check faucet balances
  const faucetUSDC = await usdcContract.balanceOf(faucetV2);
  const faucetUSDT = await usdtContract.balanceOf(faucetV2);
  const faucetUSDY = await usdyContract.balanceOf(faucetV2);
  
  console.log("\n=== Faucet V2 Balances (New Mintable Tokens) ===");
  console.log("tUSDC:", hre.ethers.formatUnits(faucetUSDC, 6));
  console.log("tUSDT:", hre.ethers.formatUnits(faucetUSDT, 6));
  console.log("tUSDY:", hre.ethers.formatUnits(faucetUSDY, 6));

  console.log("\n📝 NOT: Yeni mintable token kontratları deploy edildi.");
  console.log("    Eğer eski kontratları kullanmaya devam etmek istiyorsanız,");
  console.log("    bu yeni tokenler sadece faucet için kullanılabilir.");
  console.log("    Frontend eski token adreslerini kullanmaya devam edebilir.");
  console.log("\nYeni Token Adresleri:");
  console.log("TestUSDCV2:", testUSDCV2Address);
  console.log("TestUSDTV2:", testUSDTV2Address);
  console.log("TestUSDYV2:", testUSDYV2Address);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
