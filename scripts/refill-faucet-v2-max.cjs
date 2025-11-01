const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  const faucetV2 = "0xd23bC9993699bAFa31fc626619ad73c43E032588";
  const testUSDC = "0x53646C53e712cE320182E289E7364d4d0e4D6D01";
  const testUSDT = "0x2587521Ca49A69813991E9076B6eFbBb5CbfD19E";
  const testUSDY = "0x54D12437404aD9a4E7506C4497711b21CCE3ABCd";

  console.log("\n=== Refilling Faucet V2 with Available Tokens ===");
  
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
  
  console.log("\nDeployer balances:");
  console.log("  tUSDC:", hre.ethers.formatUnits(deployerUSDC, 6));
  console.log("  tUSDT:", hre.ethers.formatUnits(deployerUSDT, 6));
  console.log("  tUSDY:", hre.ethers.formatUnits(deployerUSDY, 6));

  // Send most of the balance (keep a small amount for gas)
  const keepAmount = hre.ethers.parseUnits("1000", 6); // Keep 1K tokens
  
  const sendUSDC = deployerUSDC > keepAmount ? deployerUSDC - keepAmount : 0n;
  const sendUSDT = deployerUSDT > keepAmount ? deployerUSDT - keepAmount : 0n;
  const sendUSDY = deployerUSDY > keepAmount ? deployerUSDY - keepAmount : 0n;

  console.log("\nSending to Faucet V2:");
  console.log("  tUSDC:", hre.ethers.formatUnits(sendUSDC, 6));
  console.log("  tUSDT:", hre.ethers.formatUnits(sendUSDT, 6));
  console.log("  tUSDY:", hre.ethers.formatUnits(sendUSDY, 6));

  // Transfer tokens to faucet
  if (sendUSDC > 0n) {
    const tx1 = await usdcContract.transfer(faucetV2, sendUSDC);
    await tx1.wait();
    console.log("✅ tUSDC transferred");
  }

  if (sendUSDT > 0n) {
    const tx2 = await usdtContract.transfer(faucetV2, sendUSDT);
    await tx2.wait();
    console.log("✅ tUSDT transferred");
  }

  if (sendUSDY > 0n) {
    const tx3 = await usdyContract.transfer(faucetV2, sendUSDY);
    await tx3.wait();
    console.log("✅ tUSDY transferred");
  }

  // Check faucet balances
  const faucetUSDC = await usdcContract.balanceOf(faucetV2);
  const faucetUSDT = await usdtContract.balanceOf(faucetV2);
  const faucetUSDY = await usdyContract.balanceOf(faucetV2);
  
  console.log("\n=== Faucet V2 Final Balances ===");
  console.log("tUSDC:", hre.ethers.formatUnits(faucetUSDC, 6));
  console.log("tUSDT:", hre.ethers.formatUnits(faucetUSDT, 6));
  console.log("tUSDY:", hre.ethers.formatUnits(faucetUSDY, 6));

  console.log("\n🎉 Faucet V2 refilled!");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
