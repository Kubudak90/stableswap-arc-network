const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  // ASS token adreslerini oku
  let assTokenAddresses = {};
  try {
    assTokenAddresses = JSON.parse(fs.readFileSync('./ass-token-addresses.json', 'utf8'));
    console.log("ASS Token addresses loaded from ass-token-addresses.json");
  } catch (e) {
    console.error("ASS Token addresses file not found! Please deploy ASS token ecosystem first.");
    console.error("Run: npx hardhat run scripts/deploy-ass-token.cjs --network arcTestnet");
    process.exit(1);
  }

  const feeDistributorAddress = assTokenAddresses.feeDistributor;
  const swap2PoolAddress = assTokenAddresses.swapContracts?.swap2Pool || "0xC4d8543f5b879eDe6885c43647E32e67Ca6DFC87";
  const swap3PoolAddress = assTokenAddresses.swapContracts?.swap3Pool || "0x34a0d6A10f26A31Ca2f7F71d4eA4B76F1Cbc2806";

  console.log("\n=== Connecting Swap Contracts to Fee Distributor ===");
  console.log("Fee Distributor:", feeDistributorAddress);
  console.log("2Pool Address:", swap2PoolAddress);
  console.log("3Pool Address:", swap3PoolAddress);

  // StableSwap ABI (sadece setFeeDistributor fonksiyonu)
  const swapABI = [
    "function setFeeDistributor(address _feeDistributor) external"
  ];

  // 2Pool'a fee distributor bağla
  console.log("\n--- Connecting 2Pool to Fee Distributor ---");
  try {
    const swap2Pool = await hre.ethers.getContractAt(swapABI, swap2PoolAddress);
    const tx1 = await swap2Pool.setFeeDistributor(feeDistributorAddress);
    await tx1.wait();
    console.log("✅ 2Pool connected to Fee Distributor");
    console.log("  Transaction:", tx1.hash);
  } catch (err) {
    console.error("❌ 2Pool connection failed:", err.message);
    console.log("  ⚠️  Kontrat henüz fee distribution entegrasyonlu değil. Yeni versiyonu deploy etmeniz gerekiyor.");
  }

  // 3Pool'a fee distributor bağla
  console.log("\n--- Connecting 3Pool to Fee Distributor ---");
  try {
    const swap3Pool = await hre.ethers.getContractAt(swapABI, swap3PoolAddress);
    const tx2 = await swap3Pool.setFeeDistributor(feeDistributorAddress);
    await tx2.wait();
    console.log("✅ 3Pool connected to Fee Distributor");
    console.log("  Transaction:", tx2.hash);
  } catch (err) {
    console.error("❌ 3Pool connection failed:", err.message);
    console.log("  ⚠️  Kontrat henüz fee distribution entegrasyonlu değil. Yeni versiyonu deploy etmeniz gerekiyor.");
  }

  console.log("\n=== Connection Summary ===");
  console.log("✅ Fee Distributor:", feeDistributorAddress);
  console.log("✅ Swap contracts have been connected (if they support fee distribution)");
  
  console.log("\n⚠️  ÖNEMLİ NOT:");
  console.log("Eğer kontratlar 'setFeeDistributor' fonksiyonunu desteklemiyorsa,");
  console.log("yeni fee-aware versiyonlarını deploy etmeniz gerekiyor:");
  console.log("  - StableSwap.sol (güncellenmiş versiyon)");
  console.log("  - StableSwap3Pool.sol (güncellenmiş versiyon)");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

