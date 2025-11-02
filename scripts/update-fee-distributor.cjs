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
  const treasury = assTokenAddresses.treasury;
  const salaryAddress = assTokenAddresses.salaryAddress;
  const buybackToken = assTokenAddresses.buybackToken;

  console.log("\n=== Deploying Updated FeeDistributor ===");
  console.log("ASSToken:", assTokenAddress);
  console.log("Treasury:", treasury);
  console.log("Salary Address:", salaryAddress);
  console.log("Buyback Token:", buybackToken);

  // Yeni FeeDistributor deploy
  const FeeDistributor = await hre.ethers.getContractFactory("FeeDistributor");
  const feeDistributor = await FeeDistributor.deploy(
    assTokenAddress,
    treasury,
    salaryAddress,
    buybackToken
  );
  await feeDistributor.waitForDeployment();
  const newFeeDistributorAddress = await feeDistributor.getAddress();
  console.log("\n✅ New FeeDistributor deployed to:", newFeeDistributorAddress);

  // Bağlantıları kur
  console.log("\n--- Setting up connections ---");
  
  // ASS Token'a yeni fee distributor'ı ver
  const ASSToken = await hre.ethers.getContractAt("ASSToken", assTokenAddress);
  const setFeeDistributorTx = await ASSToken.setFeeDistributor(newFeeDistributorAddress);
  await setFeeDistributorTx.wait();
  console.log("✅ ASS Token -> New FeeDistributor connected");

  // FeeDistributor'a staking contract'ı ver
  const stakingContractAddress = assTokenAddresses.stakingContract;
  const setStakingTx = await feeDistributor.setStakingContract(stakingContractAddress);
  await setStakingTx.wait();
  console.log("✅ FeeDistributor -> StakingContract connected");

  // FeeDistributor'a AutoBuyback'i ver
  const autoBuybackAddress = assTokenAddresses.autoBuyback;
  const setAutoBuybackTx = await feeDistributor.setAutoBuyback(autoBuybackAddress);
  await setAutoBuybackTx.wait();
  console.log("✅ FeeDistributor -> AutoBuyback connected");

  // Yeni swap kontratlarını ekle
  console.log("\n--- Adding new swap contracts ---");
  const newSwap2Pool = "0x5d4D4C908D7dfb882d5a24af713158FC805e410B";
  const newSwap3Pool = "0x16d14659A50fFB31571e4e7ac4417C1Ff22bFc70";

  const addSwap2Tx = await feeDistributor.addSwapContract(newSwap2Pool);
  await addSwap2Tx.wait();
  console.log("✅ Added new 2Pool:", newSwap2Pool);

  const addSwap3Tx = await feeDistributor.addSwapContract(newSwap3Pool);
  await addSwap3Tx.wait();
  console.log("✅ Added new 3Pool:", newSwap3Pool);

  // Yeni swap kontratlarına fee distributor'ı bağla
  console.log("\n--- Connecting swap contracts to new FeeDistributor ---");
  
  const swap2ABI = ["function setFeeDistributor(address _feeDistributor) external"];
  const swap3ABI = ["function setFeeDistributor(address _feeDistributor) external"];

  const swap2Pool = await hre.ethers.getContractAt(swap2ABI, newSwap2Pool);
  const setFee2Tx = await swap2Pool.setFeeDistributor(newFeeDistributorAddress);
  await setFee2Tx.wait();
  console.log("✅ New 2Pool -> FeeDistributor connected");

  const swap3Pool = await hre.ethers.getContractAt(swap3ABI, newSwap3Pool);
  const setFee3Tx = await swap3Pool.setFeeDistributor(newFeeDistributorAddress);
  await setFee3Tx.wait();
  console.log("✅ New 3Pool -> FeeDistributor connected");

  // Print summary
  console.log("\n=== Deployment Summary ===");
  console.log("Old FeeDistributor:", assTokenAddresses.feeDistributor);
  console.log("New FeeDistributor:", newFeeDistributorAddress);
  console.log("\n✅ Updated connections:");
  console.log("  ASS Token -> New FeeDistributor");
  console.log("  New FeeDistributor -> StakingContract");
  console.log("  New FeeDistributor -> AutoBuyback");
  console.log("  New 2Pool -> New FeeDistributor");
  console.log("  New 3Pool -> New FeeDistributor");

  // Update addresses file
  assTokenAddresses.feeDistributor = newFeeDistributorAddress;
  fs.writeFileSync('./ass-token-addresses.json', JSON.stringify(assTokenAddresses, null, 2));
  console.log("\n✅ Updated ass-token-addresses.json");

  console.log("\n⚠️  ÖNEMLİ NOTLAR:");
  console.log("1. Eski FeeDistributor'dan yeni FeeDistributor'a fee'leri migrate etmek gerekebilir");
  console.log("2. Frontend'i yeni FeeDistributor adresi ile güncelle (gerekirse)");
  console.log("3. Yeni swap kontratları artık düzeltilmiş FeeDistributor'ı kullanıyor");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

