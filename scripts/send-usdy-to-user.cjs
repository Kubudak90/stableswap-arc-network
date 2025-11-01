const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  const userAddress = "0x1D58328205429D39cE21a13DcD3FeB73180C9B20";
  
  console.log("Deployer:", deployer.address);
  console.log("User Address:", userAddress);

  const testUSDY = "0x54D12437404aD9a4E7506C4497711b21CCE3ABCd";
  const sendAmount = hre.ethers.parseUnits("100000", 6); // 100K tokens

  const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)"
  ];

  const usdyContract = new hre.ethers.Contract(testUSDY, ERC20_ABI, deployer);

  // Check balances
  const deployerBalance = await usdyContract.balanceOf(deployer.address);
  console.log("\nDeployer tUSDY:", hre.ethers.formatUnits(deployerBalance, 6));
  
  const userBalance = await usdyContract.balanceOf(userAddress);
  console.log("User tUSDY (before):", hre.ethers.formatUnits(userBalance, 6));

  if (deployerBalance < sendAmount) {
    console.log("⚠️ Deployer'da yeterli USDY yok!");
    return;
  }

  // Send USDY to user
  console.log("\nSending USDY to user...");
  const tx = await usdyContract.transfer(userAddress, sendAmount);
  await tx.wait();
  console.log("✅ USDY sent to user");

  // Check final balance
  const userBalanceAfter = await usdyContract.balanceOf(userAddress);
  console.log("User tUSDY (after):", hre.ethers.formatUnits(userBalanceAfter, 6));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
