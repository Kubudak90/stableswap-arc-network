const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  // Mevcut adresleri oku
  let assTokenAddresses = {};
  try {
    assTokenAddresses = JSON.parse(fs.readFileSync('./ass-token-addresses.json', 'utf8'));
    console.log("ASS Token addresses loaded");
  } catch (e) {
    console.error("ASS Token addresses file not found!");
    process.exit(1);
  }

  const stakingContractAddress = assTokenAddresses.stakingContract;
  const feeDistributorAddress = assTokenAddresses.feeDistributor;

  console.log("\n=== Checking StakingContract Configuration ===\n");
  console.log("StakingContract:", stakingContractAddress);
  console.log("FeeDistributor (current):", feeDistributorAddress);

  // StakingContract'taki feeDistributor adresini kontrol et
  try {
    const StakingContract = await hre.ethers.getContractAt("StakingContract", stakingContractAddress);
    const fdInStaking = await StakingContract.feeDistributor();
    console.log("\n✅ StakingContract'taki feeDistributor:", fdInStaking);
    
    if (fdInStaking.toLowerCase() !== feeDistributorAddress.toLowerCase()) {
      console.log("\n⚠️  SORUN: StakingContract'taki feeDistributor adresi yeni FeeDistributor ile eşleşmiyor!");
      console.log("   StakingContract'taki:", fdInStaking);
      console.log("   Yeni FeeDistributor:", feeDistributorAddress);
      console.log("\n   Çözüm: Yeni StakingContract deploy edilmesi gerekiyor.");
      console.log("   (feeDistributor immutable olduğu için güncellenemez)");
    } else {
      console.log("\n✅ StakingContract doğru FeeDistributor'u bekliyor.");
    }
  } catch (err) {
    console.error("❌ Kontrol başarısız:", err.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

