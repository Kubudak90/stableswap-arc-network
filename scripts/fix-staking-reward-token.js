const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Fixing StakingContract rewardToken...');
  console.log('Deployer:', deployer.address);

  const stakingContract = await ethers.getContractAt(
    'StakingContract',
    '0x57Ca9Fff43CeFe73413C07e9a45453F5eC8D5bBD'
  );

  const NEW_USDC = '0x55A97f0A3BA1f192Cf333bac116bb75eCE5d176e';

  const currentRewardToken = await stakingContract.rewardToken();
  console.log('Current rewardToken:', currentRewardToken);
  console.log('New rewardToken:', NEW_USDC);

  if (currentRewardToken.toLowerCase() !== NEW_USDC.toLowerCase()) {
    console.log('Updating rewardToken...');
    const tx = await stakingContract.setRewardToken(NEW_USDC);
    console.log('tx:', tx.hash);
    await tx.wait();
    console.log('RewardToken updated!');

    const newRewardToken = await stakingContract.rewardToken();
    console.log('Verified new rewardToken:', newRewardToken);
  } else {
    console.log('RewardToken already correct!');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
