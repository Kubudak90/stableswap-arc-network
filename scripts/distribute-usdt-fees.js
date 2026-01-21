const { ethers } = require('hardhat');

const CONTRACTS = {
  feeDistributor: '0x9d5EC576F616Dc30CB8e743a6D5334F376ff8D58',
  stakingContract: '0x57Ca9Fff43CeFe73413C07e9a45453F5eC8D5bBD',
  testUSDT: '0xDBffb8fFF6492d4100DA3cC2E6775c21F7413d70',
  testUSDY: '0x75979405a2955Cac025Ce95b852321b172B14a97',
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Distributing USDT fees...');

  const stakingContract = await ethers.getContractAt('StakingContract', CONTRACTS.stakingContract);
  const feeDistributor = await ethers.getContractAt('FeeDistributor', CONTRACTS.feeDistributor);
  const usdt = await ethers.getContractAt('IERC20', CONTRACTS.testUSDT);
  const usdy = await ethers.getContractAt('IERC20', CONTRACTS.testUSDY);

  // Check FeeDistributor balances
  const fdUSDT = await usdt.balanceOf(CONTRACTS.feeDistributor);
  const fdUSDY = await usdy.balanceOf(CONTRACTS.feeDistributor);
  console.log('FeeDistributor USDT:', ethers.formatUnits(fdUSDT, 6));
  console.log('FeeDistributor USDY:', ethers.formatUnits(fdUSDY, 6));

  // Step 1: Set rewardToken to USDT
  console.log('\n=== Setting rewardToken to USDT ===');
  const currentRewardToken = await stakingContract.rewardToken();
  console.log('Current rewardToken:', currentRewardToken);

  if (currentRewardToken.toLowerCase() !== CONTRACTS.testUSDT.toLowerCase()) {
    const tx1 = await stakingContract.setRewardToken(CONTRACTS.testUSDT);
    await tx1.wait();
    console.log('RewardToken set to USDT');
  }

  // Step 2: Distribute USDT fees
  if (fdUSDT > 0) {
    console.log('\n=== Distributing USDT fees ===');
    const tx2 = await feeDistributor.distributeFees(CONTRACTS.testUSDT);
    console.log('tx:', tx2.hash);
    await tx2.wait();
    console.log('USDT fees distributed!');
  }

  // Step 3: Check StakingContract balance
  const scUSDT = await usdt.balanceOf(CONTRACTS.stakingContract);
  console.log('\nStakingContract USDT balance:', ethers.formatUnits(scUSDT, 6));

  // Check total rewards
  const totalRewards = await stakingContract.totalRewardsCollected();
  console.log('Total rewards collected:', ethers.formatUnits(totalRewards, 6));

  console.log('\n=== Done! ===');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
