const { ethers } = require('hardhat');

async function main() {
  const stakingContract = await ethers.getContractAt(
    'StakingContract',
    '0x57Ca9Fff43CeFe73413C07e9a45453F5eC8D5bBD'
  );

  const rewardToken = await stakingContract.rewardToken();
  console.log('StakingContract rewardToken:', rewardToken);
  console.log('Expected USDC:', '0x55A97f0A3BA1f192Cf333bac116bb75eCE5d176e');
  console.log('Expected USDT:', '0xDBffb8fFF6492d4100DA3cC2E6775c21F7413d70');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
