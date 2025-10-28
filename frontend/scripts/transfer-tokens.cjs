const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const recipient = "0x1D58328205429D39cE21a13DcD3FeB73180C9B20";
  console.log("Recipient:", recipient);

  // Contract addresses
  const testUSDC = "0x53646C53e712cE320182E289E7364d4d0e4D6D01";
  const testUSDT = "0x2587521Ca49A69813991E9076B6eFbBb5CbfD19E";

  // ERC20 ABI
  const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];

  const usdcContract = new hre.ethers.Contract(testUSDC, ERC20_ABI, deployer);
  const usdtContract = new hre.ethers.Contract(testUSDT, ERC20_ABI, deployer);

  // Transfer amounts (1000 tokens each)
  const transferAmount = hre.ethers.parseUnits("1000", 6); // 6 decimals

  console.log("\n=== Current Balances ===");
  const deployerUSDC = await usdcContract.balanceOf(deployer.address);
  const deployerUSDT = await usdtContract.balanceOf(deployer.address);
  console.log("Deployer tUSDC:", hre.ethers.formatUnits(deployerUSDC, 6));
  console.log("Deployer tUSDT:", hre.ethers.formatUnits(deployerUSDT, 6));

  console.log("\n=== Transferring Tokens ===");
  
  // Transfer tUSDC
  console.log("Transferring 1000 tUSDC...");
  const tx1 = await usdcContract.transfer(recipient, transferAmount);
  await tx1.wait();
  console.log("✅ tUSDC transfer completed");

  // Transfer tUSDT
  console.log("Transferring 1000 tUSDT...");
  const tx2 = await usdtContract.transfer(recipient, transferAmount);
  await tx2.wait();
  console.log("✅ tUSDT transfer completed");

  console.log("\n=== Final Balances ===");
  const recipientUSDC = await usdcContract.balanceOf(recipient);
  const recipientUSDT = await usdtContract.balanceOf(recipient);
  console.log("Recipient tUSDC:", hre.ethers.formatUnits(recipientUSDC, 6));
  console.log("Recipient tUSDT:", hre.ethers.formatUnits(recipientUSDT, 6));

  console.log("\n🎉 Transfer completed successfully!");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
