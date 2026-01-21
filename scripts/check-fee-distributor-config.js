const { ethers } = require('hardhat');

async function main() {
  const fd = await ethers.getContractAt('FeeDistributor', '0x9d5EC576F616Dc30CB8e743a6D5334F376ff8D58');

  console.log('=== FeeDistributor Configuration ===');
  console.log('StakingContract:', await fd.stakingContract());
  console.log('Treasury:', await fd.treasury());
  console.log('SalaryAddress:', await fd.salaryAddress());
  console.log('AutoBuyback:', await fd.autoBuyback());
  console.log('BuybackToken:', await fd.buybackToken());

  console.log('\n=== Fee Shares ===');
  console.log('STAKER_SHARE:', (await fd.STAKER_SHARE()).toString(), '/ 10000 (45%)');
  console.log('BUYBACK_SHARE:', (await fd.BUYBACK_SHARE()).toString(), '/ 10000 (45%)');
  console.log('TREASURY_SHARE:', (await fd.TREASURY_SHARE()).toString(), '/ 10000 (10%)');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
