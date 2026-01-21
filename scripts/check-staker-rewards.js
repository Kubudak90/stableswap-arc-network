const { ethers } = require('hardhat');

const CONTRACTS = {
  stakingContract: '0x57Ca9Fff43CeFe73413C07e9a45453F5eC8D5bBD',
  testUSDT: '0xDBffb8fFF6492d4100DA3cC2E6775c21F7413d70',
};

// User address to check
const USER_ADDRESS = '0x9F6E9F044D3F0470438c525a3dB6CECdFE6f1A6A';

async function main() {
  console.log('Checking staker rewards...');

  const stakingContract = await ethers.getContractAt('StakingContract', CONTRACTS.stakingContract);
  const usdt = await ethers.getContractAt('IERC20', CONTRACTS.testUSDT);

  // Check total staked
  const totalStaked = await stakingContract.totalStaked();
  console.log('Total ASS staked:', ethers.formatUnits(totalStaked, 18));

  // Check StakingContract USDT balance
  const scUSDT = await usdt.balanceOf(CONTRACTS.stakingContract);
  console.log('StakingContract USDT balance:', ethers.formatUnits(scUSDT, 6));

  // Check rewardPerTokenStored
  const rewardPerToken = await stakingContract.rewardPerTokenStored();
  console.log('Reward per token stored:', ethers.formatUnits(rewardPerToken, 18));

  // Check user info
  console.log('\n=== User Info ===');
  console.log('Address:', USER_ADDRESS);

  try {
    const stakerInfo = await stakingContract.getStakerInfo(USER_ADDRESS);
    console.log('Staked amount:', ethers.formatUnits(stakerInfo.stakedAmount, 18), 'ASS');
    console.log('Pending rewards:', ethers.formatUnits(stakerInfo.pendingRewards, 6), 'USDT');
  } catch (e) {
    console.log('Error getting staker info:', e.message);
  }

  // Check earned function
  try {
    const earned = await stakingContract.earned(USER_ADDRESS);
    console.log('Earned (from earned()):', ethers.formatUnits(earned, 6), 'USDT');
  } catch (e) {
    console.log('No earned function or error:', e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
