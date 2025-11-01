const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  // Contract addresses
  const faucetV2 = "0xd23bC9993699bAFa31fc626619ad73c43E032588";
  const testUSDY = "0x54D12437404aD9a4E7506C4497711b21CCE3ABCd"; // App.jsx'teki adres

  console.log("\n=== Refilling Faucet V2 with USDY ===");
  const refillAmount = hre.ethers.parseUnits("100000", 6); // 100K tokens
  
  const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)"
  ];

  const usdyContract = new hre.ethers.Contract(testUSDY, ERC20_ABI, deployer);

  // Check balances
  const deployerUSDY = await usdyContract.balanceOf(deployer.address);
  console.log("Deployer tUSDY:", hre.ethers.formatUnits(deployerUSDY, 6));

  if (deployerUSDY < refillAmount) {
    console.log("⚠️ Deployer'da yeterli USDY yok! TestUSDY'yi deploy edip mint etmeliyiz.");
    return;
  }

  // Transfer tokens to faucet
  console.log("\nTransferring USDY to Faucet V2...");
  const tx = await usdyContract.transfer(faucetV2, refillAmount);
  await tx.wait();
  console.log("✅ tUSDY transferred");

  // Check faucet balances
  const faucetUSDY = await usdyContract.balanceOf(faucetV2);
  console.log("\n=== Faucet V2 USDY Balance ===");
  console.log("Faucet tUSDY:", hre.ethers.formatUnits(faucetUSDY, 6));

  console.log("\n🎉 Faucet V2 refilled with USDY successfully!");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
