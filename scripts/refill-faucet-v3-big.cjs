const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  const faucetV3 = "0x98E7561276E646C5376adADca27F8402bE40975e";
  const testUSDC = "0x53646C53e712cE320182E289E7364d4d0e4D6D01";
  const testUSDT = "0x2587521Ca49A69813991E9076B6eFbBb5CbfD19E";
  const testUSDY = "0x54D12437404aD9a4E7506C4497711b21CCE3ABCd";

  console.log("\n=== Refilling Faucet V3 with Large Amounts ===");
  const refillAmount = hre.ethers.parseUnits("1000000", 6); // 1M tokens each
  
  const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)"
  ];

  const usdcContract = new hre.ethers.Contract(testUSDC, ERC20_ABI, deployer);
  const usdtContract = new hre.ethers.Contract(testUSDT, ERC20_ABI, deployer);
  const usdyContract = new hre.ethers.Contract(testUSDY, ERC20_ABI, deployer);

  // Check balances
  const deployerUSDC = await usdcContract.balanceOf(deployer.address);
  const deployerUSDT = await usdtContract.balanceOf(deployer.address);
  const deployerUSDY = await usdyContract.balanceOf(deployer.address);
  
  console.log("Deployer balances:");
  console.log("  tUSDC:", hre.ethers.formatUnits(deployerUSDC, 6));
  console.log("  tUSDT:", hre.ethers.formatUnits(deployerUSDT, 6));
  console.log("  tUSDY:", hre.ethers.formatUnits(deployerUSDY, 6));

  // Transfer tokens to faucet
  console.log("\nTransferring tokens to Faucet V3...");
  if (deployerUSDC >= refillAmount) {
    const tx1 = await usdcContract.transfer(faucetV3, refillAmount);
    await tx1.wait();
    console.log("✅ tUSDC transferred");
  }
  
  if (deployerUSDT >= refillAmount) {
    const tx2 = await usdtContract.transfer(faucetV3, refillAmount);
    await tx2.wait();
    console.log("✅ tUSDT transferred");
  }
  
  if (deployerUSDY >= refillAmount) {
    const tx3 = await usdyContract.transfer(faucetV3, refillAmount);
    await tx3.wait();
    console.log("✅ tUSDY transferred");
  }

  // Check faucet balances
  const faucetUSDC = await usdcContract.balanceOf(faucetV3);
  const faucetUSDT = await usdtContract.balanceOf(faucetV3);
  const faucetUSDY = await usdyContract.balanceOf(faucetV3);
  
  console.log("\n=== Faucet V3 Balances ===");
  console.log("tUSDC:", hre.ethers.formatUnits(faucetUSDC, 6));
  console.log("tUSDT:", hre.ethers.formatUnits(faucetUSDT, 6));
  console.log("tUSDY:", hre.ethers.formatUnits(faucetUSDY, 6));

  console.log("\n🎉 Faucet V3 refilled successfully!");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
