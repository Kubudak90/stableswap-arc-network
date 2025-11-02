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

  const feeDistributorAddress = assTokenAddresses.feeDistributor;
  const swap2PoolAddress = "0x5d4D4C908D7dfb882d5a24af713158FC805e410B"; // New fee-aware 2Pool
  const swap3PoolAddress = "0x16d14659A50fFB31571e4e7ac4417C1Ff22bFc70"; // New fee-aware 3Pool

  console.log("\n=== Checking Swap Contract Connections ===\n");
  console.log("FeeDistributor:", feeDistributorAddress);
  console.log("2Pool:", swap2PoolAddress);
  console.log("3Pool:", swap3PoolAddress);
  console.log("");

  // 2Pool kontrolü
  try {
    const StableSwap = await hre.ethers.getContractAt("StableSwap", swap2PoolAddress);
    const fdIn2Pool = await StableSwap.feeDistributor();
    console.log("✅ 2Pool FeeDistributor:", fdIn2Pool);
    
    if (fdIn2Pool.toLowerCase() !== feeDistributorAddress.toLowerCase()) {
      console.log("⚠️  2Pool'un FeeDistributor'ı yanlış! Güncelleniyor...");
      const tx = await StableSwap.setFeeDistributor(feeDistributorAddress);
      await tx.wait();
      console.log("✅ 2Pool FeeDistributor güncellendi");
    }
    
    // FeeDistributor'da 2Pool kayıtlı mı?
    const FeeDistributor = await hre.ethers.getContractAt("FeeDistributor", feeDistributorAddress);
    const swapContracts = await FeeDistributor.swapContracts(0);
    console.log("✅ FeeDistributor'da ilk swap contract:", swapContracts);
    
    // collectedFees kontrolü
    const collectedFees = await FeeDistributor.collectedFees(swap2PoolAddress);
    console.log("💰 2Pool collectedFees:", hre.ethers.formatUnits(collectedFees, 6), "tUSDC");
    
  } catch (err) {
    console.error("❌ 2Pool kontrolü başarısız:", err.message);
  }

  console.log("");

  // 3Pool kontrolü
  try {
    const StableSwap3Pool = await hre.ethers.getContractAt("StableSwap3Pool", swap3PoolAddress);
    const fdIn3Pool = await StableSwap3Pool.feeDistributor();
    console.log("✅ 3Pool FeeDistributor:", fdIn3Pool);
    
    if (fdIn3Pool.toLowerCase() !== feeDistributorAddress.toLowerCase()) {
      console.log("⚠️  3Pool'un FeeDistributor'ı yanlış! Güncelleniyor...");
      const tx = await StableSwap3Pool.setFeeDistributor(feeDistributorAddress);
      await tx.wait();
      console.log("✅ 3Pool FeeDistributor güncellendi");
    }
    
    // collectedFees kontrolü
    const FeeDistributor = await hre.ethers.getContractAt("FeeDistributor", feeDistributorAddress);
    const collectedFees = await FeeDistributor.collectedFees(swap3PoolAddress);
    console.log("💰 3Pool collectedFees:", hre.ethers.formatUnits(collectedFees, 6), "tUSDC");
    
  } catch (err) {
    console.error("❌ 3Pool kontrolü başarısız:", err.message);
  }

  console.log("");

  // FeeDistributor balance kontrolü
  try {
    const FeeDistributor = await hre.ethers.getContractAt("FeeDistributor", feeDistributorAddress);
    const rewardTokenAddress = assTokenAddresses.rewardToken; // tUSDC
    const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];
    const tokenContract = await hre.ethers.getContractAt(ERC20_ABI, rewardTokenAddress);
    const balance = await tokenContract.balanceOf(feeDistributorAddress);
    console.log("💰 FeeDistributor actual balance:", hre.ethers.formatUnits(balance, 6), "tUSDC");
    
    // Toplam collectedFees
    const swapContracts = await FeeDistributor.swapContracts(0);
    const swapContracts1 = await FeeDistributor.swapContracts(1);
    const fees0 = await FeeDistributor.collectedFees(swapContracts);
    const fees1 = await FeeDistributor.collectedFees(swapContracts1);
    console.log("💰 Total collectedFees (mapping):", hre.ethers.formatUnits(fees0 + fees1, 6), "tUSDC");
    
    if (balance < fees0 + fees1) {
      console.log("\n⚠️  SORUN: collectedFees mapping'deki miktar gerçek balance'dan fazla!");
      console.log("   Bu, fee'lerin swap kontratları tarafından transfer edilmediği anlamına gelir.");
      console.log("   Çözüm: Yeni swap işlemi yapın veya eski fee'leri sıfırlayın.");
    }
    
  } catch (err) {
    console.error("❌ Balance kontrolü başarısız:", err.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

