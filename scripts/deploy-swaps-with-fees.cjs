const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  // Mevcut token adresleri
  const testUSDC = "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733"; // TestUSDCV2
  const testUSDT = "0x787804d1f98F4Da65C6de63AaA00906A8C6868F3"; // TestUSDTV2
  const testUSDY = "0x4D81e87902aA4Cf67D99055D44b6D0341fCc419a"; // TestUSDYV2

  // ASS Token ekosistem adresleri
  let assTokenAddresses = {};
  try {
    assTokenAddresses = JSON.parse(fs.readFileSync('./ass-token-addresses.json', 'utf8'));
    console.log("ASS Token addresses loaded");
  } catch (e) {
    console.error("ASS Token addresses file not found!");
    process.exit(1);
  }

  const feeDistributorAddress = assTokenAddresses.feeDistributor;

  console.log("\n=== Deploying Fee-Aware Swap Contracts ===");
  
  // 1. StableSwap (2Pool) deploy
  console.log("\n--- Deploying StableSwap (2Pool) ---");
  const StableSwap = await hre.ethers.getContractFactory("StableSwap");
  const stableSwap2Pool = await StableSwap.deploy(testUSDC, testUSDT);
  await stableSwap2Pool.waitForDeployment();
  const stableSwap2PoolAddress = await stableSwap2Pool.getAddress();
  console.log("StableSwap 2Pool deployed to:", stableSwap2PoolAddress);

  // FeeDistributor'ı bağla
  const setFee2Tx = await stableSwap2Pool.setFeeDistributor(feeDistributorAddress);
  await setFee2Tx.wait();
  console.log("✅ FeeDistributor connected to 2Pool");

  // 2. StableSwap3Pool deploy
  console.log("\n--- Deploying StableSwap3Pool ---");
  const StableSwap3Pool = await hre.ethers.getContractFactory("StableSwap3Pool");
  const stableSwap3Pool = await StableSwap3Pool.deploy(testUSDC, testUSDT, testUSDY);
  await stableSwap3Pool.waitForDeployment();
  const stableSwap3PoolAddress = await stableSwap3Pool.getAddress();
  console.log("StableSwap3Pool deployed to:", stableSwap3PoolAddress);

  // FeeDistributor'ı bağla
  const setFee3Tx = await stableSwap3Pool.setFeeDistributor(feeDistributorAddress);
  await setFee3Tx.wait();
  console.log("✅ FeeDistributor connected to 3Pool");

  // 3. FeeDistributor'a yeni swap kontratlarını ekle
  console.log("\n--- Adding new swap contracts to FeeDistributor ---");
  const FeeDistributor = await hre.ethers.getContractAt(
    "FeeDistributor",
    feeDistributorAddress
  );
  
  const addSwap2Tx = await FeeDistributor.addSwapContract(stableSwap2PoolAddress);
  await addSwap2Tx.wait();
  console.log("✅ Added new 2Pool to FeeDistributor");

  const addSwap3Tx = await FeeDistributor.addSwapContract(stableSwap3PoolAddress);
  await addSwap3Tx.wait();
  console.log("✅ Added new 3Pool to FeeDistributor");

  // 4. LiquidityRewards'a yeni pool'ları ekle
  // Not: setPool sadece allocPoint güncelliyor, poolContract adresini değiştirmiyor
  // Bu yüzden yeni pool'ları ekleyeceğiz (eski pool'lar kalacak, ama kullanılmaz)
  console.log("\n--- Adding new pools to LiquidityRewards ---");
  const liquidityRewardsAddress = assTokenAddresses.liquidityRewards;
  const LiquidityRewards = await hre.ethers.getContractAt(
    "LiquidityRewards",
    liquidityRewardsAddress
  );

  // Yeni 2Pool'u ekle
  const addPool2Tx = await LiquidityRewards.addPool(stableSwap2PoolAddress, 100);
  await addPool2Tx.wait();
  console.log("✅ Added new 2Pool to LiquidityRewards");

  // Yeni 3Pool'u ekle
  const addPool3Tx = await LiquidityRewards.addPool(stableSwap3PoolAddress, 100);
  await addPool3Tx.wait();
  console.log("✅ Added new 3Pool to LiquidityRewards");

  console.log("⚠️  NOT: Eski pool'lar (0 ve 1) artık kullanılmıyor, yeni pool'lar eklendi");

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("New StableSwap 2Pool:", stableSwap2PoolAddress);
  console.log("New StableSwap3Pool:", stableSwap3PoolAddress);
  console.log("FeeDistributor:", feeDistributorAddress);
  console.log("LiquidityRewards:", liquidityRewardsAddress);

  // Save addresses
  const addresses = {
    stableSwap2Pool: stableSwap2PoolAddress,
    stableSwap3Pool: stableSwap3PoolAddress,
    feeDistributor: feeDistributorAddress,
    liquidityRewards: liquidityRewardsAddress,
    tokens: {
      testUSDC: testUSDC,
      testUSDT: testUSDT,
      testUSDY: testUSDY
    },
    network: hre.network.name,
    deployer: deployer.address
  };

  fs.writeFileSync('./new-swap-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\n✅ Addresses saved to new-swap-addresses.json");

  console.log("\n⚠️  ÖNEMLİ NOTLAR:");
  console.log("1. Bu yeni kontratlar fee distribution'a bağlı");
  console.log("2. Mevcut likiditeyi migrate etmek için eski kontratlardan yeni kontratlara transfer yapılmalı");
  console.log("3. Frontend'i yeni kontrat adresleri ile güncelleyin");
  console.log("\n🔗 Eski kontratlar (migrate edilmeli):");
  console.log("  2Pool: 0xC4d8543f5b879eDe6885c43647E32e67Ca6DFC87");
  console.log("  3Pool: 0x34a0d6A10f26A31Ca2f7F71d4eA4B76F1Cbc2806");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

