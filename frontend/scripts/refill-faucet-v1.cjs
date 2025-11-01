const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  // Contract addresses
  const testUSDC = "0x53646C53e712cE320182E289E7364d4d0e4D6D01";
  const testUSDT = "0x2587521Ca49A69813991E9076B6eFbBb5CbfD19E";
  const faucetV1 = "0x1809123f52ebE8f80e328D99a16Ee42D679B2bA6"; // Eski faucet

  console.log("\n=== Refilling Faucet V1 ===");
  const refillAmount = hre.ethers.parseUnits("100000", 6); // 100K tokens
  
  const usdcContract = new hre.ethers.Contract(testUSDC, [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)"
  ], deployer);
  
  const usdtContract = new hre.ethers.Contract(testUSDT, [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)"
  ], deployer);

  // Check balances
  const deployerUSDC = await usdcContract.balanceOf(deployer.address);
  const deployerUSDT = await usdtContract.balanceOf(deployer.address);
  console.log("Deployer tUSDC:", hre.ethers.formatUnits(deployerUSDC, 6));
  console.log("Deployer tUSDT:", hre.ethers.formatUnits(deployerUSDT, 6));

  // Transfer tokens to faucet
  console.log("\nTransferring tokens to Faucet V1...");
  const tx1 = await usdcContract.transfer(faucetV1, refillAmount);
  await tx1.wait();
  console.log("✅ tUSDC transferred");

  const tx2 = await usdtContract.transfer(faucetV1, refillAmount);
  await tx2.wait();
  console.log("✅ tUSDT transferred");

  // Check faucet balances
  const faucetUSDC = await usdcContract.balanceOf(faucetV1);
  const faucetUSDT = await usdtContract.balanceOf(faucetV1);
  console.log("\n=== Faucet V1 Balances ===");
  console.log("Faucet tUSDC:", hre.ethers.formatUnits(faucetUSDC, 6));
  console.log("Faucet tUSDT:", hre.ethers.formatUnits(faucetUSDT, 6));

  console.log("\n🎉 Faucet V1 refilled successfully!");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
