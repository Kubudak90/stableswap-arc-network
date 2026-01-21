const { ethers } = require('hardhat');

// Contract addresses from config
const CONTRACTS = {
  swap: '0x81fEDF05DEaD9a49B4295B54201F4e35238fB59b',
  swap3Pool: '0xE8513b949C9034Ce25712482bC0c622aFbbC9B7d',
  feeDistributor: '0x9d5EC576F616Dc30CB8e743a6D5334F376ff8D58',
  stakingContract: '0x57Ca9Fff43CeFe73413C07e9a45453F5eC8D5bBD',
  testUSDC: '0x55A97f0A3BA1f192Cf333bac116bb75eCE5d176e',
  testUSDT: '0xDBffb8fFF6492d4100DA3cC2E6775c21F7413d70',
  testUSDY: '0x75979405a2955Cac025Ce95b852321b172B14a97',
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Checking fee distribution setup...\n');

  // Get contract instances
  const feeDistributor = await ethers.getContractAt('FeeDistributor', CONTRACTS.feeDistributor);
  const pool2 = await ethers.getContractAt('StableSwapPoolV2', CONTRACTS.swap);
  const pool3 = await ethers.getContractAt('StableSwap3PoolV2', CONTRACTS.swap3Pool);

  // Check FeeDistributor configuration
  console.log('=== FeeDistributor Configuration ===');
  const stakingContract = await feeDistributor.stakingContract();
  console.log('Staking Contract:', stakingContract);
  console.log('Expected:', CONTRACTS.stakingContract);
  console.log('Match:', stakingContract.toLowerCase() === CONTRACTS.stakingContract.toLowerCase());

  const swapContracts = await feeDistributor.getSwapContracts();
  console.log('\nRegistered Swap Contracts:', swapContracts);
  console.log('2Pool registered:', swapContracts.map(s => s.toLowerCase()).includes(CONTRACTS.swap.toLowerCase()));
  console.log('3Pool registered:', swapContracts.map(s => s.toLowerCase()).includes(CONTRACTS.swap3Pool.toLowerCase()));

  // Check pool feeDistributor settings
  console.log('\n=== Pool FeeDistributor Settings ===');
  const pool2FeeDistributor = await pool2.feeDistributor();
  const pool3FeeDistributor = await pool3.feeDistributor();
  console.log('2Pool feeDistributor:', pool2FeeDistributor);
  console.log('3Pool feeDistributor:', pool3FeeDistributor);

  // Check collected fees in pools
  console.log('\n=== Collected Fees in Pools ===');
  try {
    const fees2_0 = await pool2.collectedFees0();
    const fees2_1 = await pool2.collectedFees1();
    console.log('2Pool collectedFees0 (USDC):', ethers.formatUnits(fees2_0, 6));
    console.log('2Pool collectedFees1 (USDT):', ethers.formatUnits(fees2_1, 6));
  } catch (e) {
    console.log('2Pool fees check failed:', e.message);
  }

  try {
    const fees3_0 = await pool3.collectedFees0();
    const fees3_1 = await pool3.collectedFees1();
    const fees3_2 = await pool3.collectedFees2();
    console.log('3Pool collectedFees0 (USDC):', ethers.formatUnits(fees3_0, 6));
    console.log('3Pool collectedFees1 (USDT):', ethers.formatUnits(fees3_1, 6));
    console.log('3Pool collectedFees2 (USDY):', ethers.formatUnits(fees3_2, 6));
  } catch (e) {
    console.log('3Pool fees check failed:', e.message);
  }

  // Check FeeDistributor balances
  console.log('\n=== FeeDistributor Token Balances ===');
  const usdc = await ethers.getContractAt('IERC20', CONTRACTS.testUSDC);
  const usdt = await ethers.getContractAt('IERC20', CONTRACTS.testUSDT);
  const usdy = await ethers.getContractAt('IERC20', CONTRACTS.testUSDY);

  const fdUSDC = await usdc.balanceOf(CONTRACTS.feeDistributor);
  const fdUSDT = await usdt.balanceOf(CONTRACTS.feeDistributor);
  const fdUSDY = await usdy.balanceOf(CONTRACTS.feeDistributor);
  console.log('USDC balance:', ethers.formatUnits(fdUSDC, 6));
  console.log('USDT balance:', ethers.formatUnits(fdUSDT, 6));
  console.log('USDY balance:', ethers.formatUnits(fdUSDY, 6));

  // Check StakingContract balances
  console.log('\n=== StakingContract Token Balances ===');
  const scUSDC = await usdc.balanceOf(CONTRACTS.stakingContract);
  const scUSDT = await usdt.balanceOf(CONTRACTS.stakingContract);
  const scUSDY = await usdy.balanceOf(CONTRACTS.stakingContract);
  console.log('USDC balance:', ethers.formatUnits(scUSDC, 6));
  console.log('USDT balance:', ethers.formatUnits(scUSDT, 6));
  console.log('USDY balance:', ethers.formatUnits(scUSDY, 6));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
