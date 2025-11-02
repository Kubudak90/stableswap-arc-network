const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  // Mevcut ASS token adreslerini oku
  let assTokenAddresses = {};
  try {
    assTokenAddresses = JSON.parse(fs.readFileSync('./ass-token-addresses.json', 'utf8'));
    console.log("ASS Token addresses loaded");
  } catch (e) {
    console.error("ASS Token addresses file not found!");
    process.exit(1);
  }

  const assTokenAddress = assTokenAddresses.assToken;

  console.log("\n=== Deploying Updated LiquidityRewards ===");
  console.log("ASSToken:", assTokenAddress);

  // Yeni LiquidityRewards deploy
  const LiquidityRewards = await hre.ethers.getContractFactory("LiquidityRewards");
  const liquidityRewards = await LiquidityRewards.deploy(assTokenAddress);
  await liquidityRewards.waitForDeployment();
  const newLiquidityRewardsAddress = await liquidityRewards.getAddress();
  console.log("\n✅ New LiquidityRewards deployed to:", newLiquidityRewardsAddress);

  // Bağlantıları kur
  console.log("\n--- Setting up connections ---");
  
  // ASS Token'a yeni LiquidityRewards mint yetkisi ver
  const ASSToken = await hre.ethers.getContractAt("ASSToken", assTokenAddress);
  const setLiquidityRewardsTx = await ASSToken.setLiquidityRewards(newLiquidityRewardsAddress);
  await setLiquidityRewardsTx.wait();
  console.log("✅ ASS Token -> New LiquidityRewards connected (mint yetkisi)");

  // Mevcut pool'ları yeni LiquidityRewards'a ekle
  console.log("\n--- Adding pools to new LiquidityRewards ---");
  const newSwap2Pool = "0x5d4D4C908D7dfb882d5a24af713158FC805e410B";
  const newSwap3Pool = "0x16d14659A50fFB31571e4e7ac4417C1Ff22bFc70";

  // Pool 0: 2Pool (allocation point: 100)
  const addPool2Tx = await liquidityRewards.addPool(newSwap2Pool, 100);
  await addPool2Tx.wait();
  console.log("✅ Added 2Pool to new LiquidityRewards (allocPoint: 100, poolId: 0)");
  
  // Pool 1: 3Pool (allocation point: 100)
  const addPool3Tx = await liquidityRewards.addPool(newSwap3Pool, 100);
  await addPool3Tx.wait();
  console.log("✅ Added 3Pool to new LiquidityRewards (allocPoint: 100, poolId: 1)");

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("Old LiquidityRewards:", assTokenAddresses.liquidityRewards);
  console.log("New LiquidityRewards:", newLiquidityRewardsAddress);
  console.log("\n✅ Updated connections:");
  console.log("  ASS Token -> New LiquidityRewards (mint yetkisi)");
  console.log("\nPools added to new LiquidityRewards:");
  console.log("  Pool 0 (2Pool):", newSwap2Pool);
  console.log("  Pool 1 (3Pool):", newSwap3Pool);
  console.log("\n⚠️  NOT: Pool ID'ler değişti!");
  console.log("  Eski: 2Pool = poolId 2, 3Pool = poolId 3");
  console.log("  Yeni: 2Pool = poolId 0, 3Pool = poolId 1");
  console.log("  Frontend'i güncellemeniz gerekecek!");

  // Update addresses file
  assTokenAddresses.liquidityRewards = newLiquidityRewardsAddress;
  fs.writeFileSync('./ass-token-addresses.json', JSON.stringify(assTokenAddresses, null, 2));
  console.log("\n✅ Updated ass-token-addresses.json");

  console.log("\n⚠️  ÖNEMLİ NOTLAR:");
  console.log("1. Frontend'de pool ID'leri güncellenmeli: 2Pool = 0, 3Pool = 1");
  console.log("2. Eski LiquidityRewards'daki pending rewards migrate edilemez (yeni baştan başlanacak)");
  console.log("3. Yeni kontrat ödülleri anında biriktirmeye başlayacak");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

