const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  console.log("\n=== Deploying ASS Token Ecosystem ===");
  
  // 1. ASS Token deploy
  console.log("\n--- Deploying ASSToken ---");
  const ASSToken = await hre.ethers.getContractFactory("ASSToken");
  const assToken = await ASSToken.deploy();
  await assToken.waitForDeployment();
  const assTokenAddress = await assToken.getAddress();
  console.log("ASSToken deployed to:", assTokenAddress);

  // 2. FeeDistributor deploy
  // İlk önce gerekli adresleri belirle
  const treasury = deployer.address; // Treasury adresi (DAO'ya verilecek)
  const developerAddress = "0x1D58328205429D39cE21a13DcD3FeB73180C9B20"; // Developer adresi (maaş alacak)
  const salaryAddress = developerAddress; // Maaş adresi
  const buybackToken = "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733"; // TestUSDCV2 (mintable)
  
  console.log("\n--- Deploying FeeDistributor ---");
  console.log("  Treasury:", treasury);
  console.log("  Salary Address:", salaryAddress);
  console.log("  Buyback Token:", buybackToken);
  
  const FeeDistributor = await hre.ethers.getContractFactory("FeeDistributor");
  const feeDistributor = await FeeDistributor.deploy(
    assTokenAddress,
    treasury,
    salaryAddress,
    buybackToken
  );
  await feeDistributor.waitForDeployment();
  const feeDistributorAddress = await feeDistributor.getAddress();
  console.log("FeeDistributor deployed to:", feeDistributorAddress);

  // 3. LiquidityRewards deploy (Pool ödülleri için - önce deploy edilmeli)
  console.log("\n--- Deploying LiquidityRewards ---");
  const LiquidityRewards = await hre.ethers.getContractFactory("LiquidityRewards");
  const liquidityRewards = await LiquidityRewards.deploy(assTokenAddress);
  await liquidityRewards.waitForDeployment();
  const liquidityRewardsAddress = await liquidityRewards.getAddress();
  console.log("LiquidityRewards deployed to:", liquidityRewardsAddress);

  // 3.5. StakingContract deploy
  const rewardToken = "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733"; // TestUSDCV2 (reward olarak)
  
  console.log("\n--- Deploying StakingContract ---");
  console.log("  Reward Token:", rewardToken);
  
  const StakingContract = await hre.ethers.getContractFactory("StakingContract");
  const stakingContract = await StakingContract.deploy(
    assTokenAddress,
    feeDistributorAddress,
    rewardToken
  );
  await stakingContract.waitForDeployment();
  const stakingContractAddress = await stakingContract.getAddress();
  console.log("StakingContract deployed to:", stakingContractAddress);

  // 3.6. AutoBuyback deploy
  console.log("\n--- Deploying AutoBuyback ---");
  const AutoBuyback = await hre.ethers.getContractFactory("AutoBuyback");
  const autoBuyback = await AutoBuyback.deploy(
    assTokenAddress,
    feeDistributorAddress,
    buybackToken,
    salaryAddress
  );
  await autoBuyback.waitForDeployment();
  const autoBuybackAddress = await autoBuyback.getAddress();
  console.log("AutoBuyback deployed to:", autoBuybackAddress);

  // 4. Bağlantıları kur
  console.log("\n--- Setting up connections ---");
  
  // ASS Token'a fee distributor'ı ver
  const setFeeDistributorTx = await assToken.setFeeDistributor(feeDistributorAddress);
  await setFeeDistributorTx.wait();
  console.log("✅ ASS Token -> FeeDistributor connected");
  
  // ASS Token'a LiquidityRewards mint yetkisi ver (POOL ÖDÜLLERİ İÇİN)
  const setLiquidityRewardsTx = await assToken.setLiquidityRewards(liquidityRewardsAddress);
  await setLiquidityRewardsTx.wait();
  console.log("✅ ASS Token -> LiquidityRewards connected (mint yetkisi)");
  
  // ASS Token'a staking contract'ı ver
  const setStakingTx = await assToken.setStakingContract(stakingContractAddress);
  await setStakingTx.wait();
  console.log("✅ ASS Token -> StakingContract connected");
  
  // FeeDistributor'a staking contract'ı ver
  const setStakingInFeeTx = await feeDistributor.setStakingContract(stakingContractAddress);
  await setStakingInFeeTx.wait();
  console.log("✅ FeeDistributor -> StakingContract connected");
  
  // FeeDistributor'a AutoBuyback'i ver
  const setAutoBuybackTx = await feeDistributor.setAutoBuyback(autoBuybackAddress);
  await setAutoBuybackTx.wait();
  console.log("✅ FeeDistributor -> AutoBuyback connected");

  // 5. Mevcut swap kontratlarını ekle (opsiyonel)
  const existingSwap2Pool = "0xC4d8543f5b879eDe6885c43647E32e67Ca6DFC87"; // StableSwap V2
  const existingSwap3Pool = "0x34a0d6A10f26A31Ca2f7F71d4eA4B76F1Cbc2806"; // StableSwap3Pool
  
  console.log("\n--- Adding existing swap contracts ---");
  const addSwap2Tx = await feeDistributor.addSwapContract(existingSwap2Pool);
  await addSwap2Tx.wait();
  console.log("✅ Added StableSwap 2Pool:", existingSwap2Pool);
  
  const addSwap3Tx = await feeDistributor.addSwapContract(existingSwap3Pool);
  await addSwap3Tx.wait();
  console.log("✅ Added StableSwap 3Pool:", existingSwap3Pool);

  // 6. Pool'ları LiquidityRewards'a ekle
  console.log("\n--- Adding pools to LiquidityRewards ---");
  // Pool 0: 2Pool (allocation point: 100)
  const addPool2Tx = await liquidityRewards.addPool(existingSwap2Pool, 100);
  await addPool2Tx.wait();
  console.log("✅ Added 2Pool to LiquidityRewards (allocPoint: 100)");
  
  // Pool 1: 3Pool (allocation point: 100)
  const addPool3Tx = await liquidityRewards.addPool(existingSwap3Pool, 100);
  await addPool3Tx.wait();
  console.log("✅ Added 3Pool to LiquidityRewards (allocPoint: 100)");

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("ASSToken:", assTokenAddress);
  console.log("FeeDistributor:", feeDistributorAddress);
  console.log("LiquidityRewards:", liquidityRewardsAddress);
  console.log("StakingContract:", stakingContractAddress);
  console.log("AutoBuyback:", autoBuybackAddress);
  console.log("\nConfiguration:");
  console.log("  Treasury:", treasury);
  console.log("  Salary Address (Developer):", salaryAddress);
  console.log("  Buyback Token:", buybackToken);
  console.log("  Reward Token:", rewardToken);
  console.log("  Buyback Interval: 6 hours");
  console.log("\nSwap Contracts Added:");
  console.log("  2Pool:", existingSwap2Pool);
  console.log("  3Pool:", existingSwap3Pool);

  // Save addresses
  const addresses = {
    assToken: assTokenAddress,
    feeDistributor: feeDistributorAddress,
    liquidityRewards: liquidityRewardsAddress,
    stakingContract: stakingContractAddress,
    autoBuyback: autoBuybackAddress,
    treasury: treasury,
    salaryAddress: salaryAddress,
    developerAddress: developerAddress,
    buybackToken: buybackToken,
    rewardToken: rewardToken,
    swapContracts: {
      swap2Pool: existingSwap2Pool,
      swap3Pool: existingSwap3Pool
    },
    network: hre.network.name,
    deployer: deployer.address
  };

  fs.writeFileSync('./ass-token-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("\n✅ Addresses saved to ass-token-addresses.json");
  
  console.log("\n⚠️  ÖNEMLİ NOTLAR:");
  console.log("1. Mevcut StableSwap kontratları fee distribution'a entegre edilmeli!");
  console.log("2. Treasury adresi DAO'ya transfer edilebilir");
  console.log("3. StableSwapWithFees kontratı kullanılmalı veya mevcut kontratlar güncellenmeli");
  console.log("4. AutoBuyback her 6 saatte bir executeBuyback() çağrılmalı (keeper bot)");
  console.log("5. Maaş adresi:", salaryAddress);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

