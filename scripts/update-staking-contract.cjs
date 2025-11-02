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
  const feeDistributorAddress = assTokenAddresses.feeDistributor;
  const rewardToken = assTokenAddresses.rewardToken; // TestUSDCV2

  console.log("\n=== Deploying Updated StakingContract ===");
  console.log("ASSToken:", assTokenAddress);
  console.log("FeeDistributor:", feeDistributorAddress);
  console.log("Reward Token:", rewardToken);

  // Yeni StakingContract deploy
  const StakingContract = await hre.ethers.getContractFactory("StakingContract");
  const stakingContract = await StakingContract.deploy(
    assTokenAddress,
    feeDistributorAddress,
    rewardToken
  );
  await stakingContract.waitForDeployment();
  const newStakingContractAddress = await stakingContract.getAddress();
  console.log("\n✅ New StakingContract deployed to:", newStakingContractAddress);

  // Bağlantıları kur
  console.log("\n--- Setting up connections ---");
  
  // ASS Token'a staking contract'ı ver
  const ASSToken = await hre.ethers.getContractAt("ASSToken", assTokenAddress);
  const setStakingTx = await ASSToken.setStakingContract(newStakingContractAddress);
  await setStakingTx.wait();
  console.log("✅ ASS Token -> New StakingContract connected");

  // FeeDistributor'a yeni staking contract'ı ver
  const FeeDistributor = await hre.ethers.getContractAt("FeeDistributor", feeDistributorAddress);
  const setStakingInFeeTx = await FeeDistributor.setStakingContract(newStakingContractAddress);
  await setStakingInFeeTx.wait();
  console.log("✅ FeeDistributor -> New StakingContract connected");

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("Old StakingContract:", assTokenAddresses.stakingContract);
  console.log("New StakingContract:", newStakingContractAddress);
  console.log("\n✅ Updated connections:");
  console.log("  ASS Token -> New StakingContract");
  console.log("  FeeDistributor -> New StakingContract");

  // Update addresses file
  assTokenAddresses.stakingContract = newStakingContractAddress;
  fs.writeFileSync('./ass-token-addresses.json', JSON.stringify(assTokenAddresses, null, 2));
  console.log("\n✅ Updated ass-token-addresses.json");

  console.log("\n⚠️  ÖNEMLİ NOTLAR:");
  console.log("1. Eski StakingContract'daki stake edilen ASS token'lar migrate edilemez");
  console.log("2. Kullanıcıların yeniden stake etmesi gerekecek");
  console.log("3. Frontend'i yeni StakingContract adresi ile güncelleyin");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

