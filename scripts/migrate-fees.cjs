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

  const oldFeeDistributorAddress = "0x752C68A68F2dE008e73B80FF6562f5D64DEfc762";
  const newFeeDistributorAddress = assTokenAddresses.feeDistributor;
  const rewardTokenAddress = assTokenAddresses.rewardToken; // tUSDC

  console.log("\n=== Migrating Fees from Old to New FeeDistributor ===");
  console.log("Old FeeDistributor:", oldFeeDistributorAddress);
  console.log("New FeeDistributor:", newFeeDistributorAddress);
  console.log("Reward Token (tUSDC):", rewardTokenAddress);

  // ERC20 ABI
  const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)"
  ];

  // Old FeeDistributor balance kontrolü
  const oldFD = await hre.ethers.getContractAt(ERC20_ABI, rewardTokenAddress);
  const oldBalance = await oldFD.balanceOf(oldFeeDistributorAddress);
  console.log("\n💰 Old FeeDistributor balance:", hre.ethers.formatUnits(oldBalance, 6), "tUSDC");

  if (oldBalance === 0n) {
    console.log("⚠️  Old FeeDistributor'da token yok, migration gerekmiyor.");
    return;
  }

  // Old FeeDistributor'dan yeni'ye transfer et
  // NOT: Old FeeDistributor'un owner'ı değiliz, bu yüzden direkt transfer edemeyiz
  // Ancak, eğer old FeeDistributor'da bir "withdraw" veya "emergencyWithdraw" fonksiyonu varsa kullanabiliriz
  // Ya da owner'dan yardım almalıyız

  // Alternatif: Yeni swap'lar zaten yeni FeeDistributor'u kullanıyor
  // Eski fee'ler old FeeDistributor'da kalacak ama yeni fee'ler yeni'ye gidecek
  console.log("\n⚠️  NOT: Old FeeDistributor'un owner'ı değiliz, direkt transfer edemeyiz.");
  console.log("   Ancak yeni swap'lar zaten yeni FeeDistributor'u kullanıyor.");
  console.log("   Eski fee'ler old FeeDistributor'da kalacak, yeni fee'ler yeni'ye gidecek.");
  console.log("   Old FeeDistributor'daki fee'leri kullanmak isterseniz, owner'dan yardım almalısınız.");

  // New FeeDistributor balance kontrolü
  const newBalance = await oldFD.balanceOf(newFeeDistributorAddress);
  console.log("💰 New FeeDistributor balance:", hre.ethers.formatUnits(newBalance, 6), "tUSDC");
  
  console.log("\n✅ Migration bilgilendirmesi tamamlandı.");
  console.log("   Yeni swap işlemleri artık yeni FeeDistributor'a fee gönderecek.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

