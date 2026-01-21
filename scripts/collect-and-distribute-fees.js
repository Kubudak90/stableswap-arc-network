const { ethers } = require('hardhat');

const CONTRACTS = {
  swap: '0x81fEDF05DEaD9a49B4295B54201F4e35238fB59b',
  swap3Pool: '0xE8513b949C9034Ce25712482bC0c622aFbbC9B7d',
  feeDistributor: '0x9d5EC576F616Dc30CB8e743a6D5334F376ff8D58',
  testUSDC: '0x55A97f0A3BA1f192Cf333bac116bb75eCE5d176e',
  testUSDT: '0xDBffb8fFF6492d4100DA3cC2E6775c21F7413d70',
  testUSDY: '0x75979405a2955Cac025Ce95b852321b172B14a97',
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Collecting and distributing fees...');
  console.log('Deployer:', deployer.address);

  const feeDistributor = await ethers.getContractAt('FeeDistributor', CONTRACTS.feeDistributor);
  const pool2 = await ethers.getContractAt('StableSwapPoolV2', CONTRACTS.swap);
  const pool3 = await ethers.getContractAt('StableSwap3PoolV2', CONTRACTS.swap3Pool);

  // Step 1: Collect fees from 2Pool
  console.log('\n=== Step 1: Collecting fees from 2Pool ===');
  try {
    const fees2_0 = await pool2.collectedFees0();
    const fees2_1 = await pool2.collectedFees1();
    console.log('2Pool pending USDC:', ethers.formatUnits(fees2_0, 6));
    console.log('2Pool pending USDT:', ethers.formatUnits(fees2_1, 6));

    if (fees2_0 > 0 || fees2_1 > 0) {
      const tx1 = await pool2.collectFees();
      console.log('Collecting 2Pool fees... tx:', tx1.hash);
      await tx1.wait();
      console.log('2Pool fees collected!');
    } else {
      console.log('No fees to collect from 2Pool');
    }
  } catch (e) {
    console.log('2Pool collectFees error:', e.message);
  }

  // Step 2: Collect fees from 3Pool
  console.log('\n=== Step 2: Collecting fees from 3Pool ===');
  try {
    const fees3_0 = await pool3.collectedFees0();
    const fees3_1 = await pool3.collectedFees1();
    const fees3_2 = await pool3.collectedFees2();
    console.log('3Pool pending USDC:', ethers.formatUnits(fees3_0, 6));
    console.log('3Pool pending USDT:', ethers.formatUnits(fees3_1, 6));
    console.log('3Pool pending USDY:', ethers.formatUnits(fees3_2, 6));

    if (fees3_0 > 0 || fees3_1 > 0 || fees3_2 > 0) {
      const tx2 = await pool3.collectFees();
      console.log('Collecting 3Pool fees... tx:', tx2.hash);
      await tx2.wait();
      console.log('3Pool fees collected!');
    } else {
      console.log('No fees to collect from 3Pool');
    }
  } catch (e) {
    console.log('3Pool collectFees error:', e.message);
  }

  // Step 3: Check FeeDistributor balances
  console.log('\n=== Step 3: FeeDistributor Balances After Collection ===');
  const usdc = await ethers.getContractAt('IERC20', CONTRACTS.testUSDC);
  const usdt = await ethers.getContractAt('IERC20', CONTRACTS.testUSDT);
  const usdy = await ethers.getContractAt('IERC20', CONTRACTS.testUSDY);

  const fdUSDC = await usdc.balanceOf(CONTRACTS.feeDistributor);
  const fdUSDT = await usdt.balanceOf(CONTRACTS.feeDistributor);
  const fdUSDY = await usdy.balanceOf(CONTRACTS.feeDistributor);
  console.log('USDC:', ethers.formatUnits(fdUSDC, 6));
  console.log('USDT:', ethers.formatUnits(fdUSDT, 6));
  console.log('USDY:', ethers.formatUnits(fdUSDY, 6));

  // Step 4: Distribute fees
  console.log('\n=== Step 4: Distributing Fees to Stakers ===');

  if (fdUSDC > 0) {
    console.log('Distributing USDC fees...');
    const tx3 = await feeDistributor.distributeFees(CONTRACTS.testUSDC);
    await tx3.wait();
    console.log('USDC distributed!');
  }

  if (fdUSDT > 0) {
    console.log('Distributing USDT fees...');
    const tx4 = await feeDistributor.distributeFees(CONTRACTS.testUSDT);
    await tx4.wait();
    console.log('USDT distributed!');
  }

  if (fdUSDY > 0) {
    console.log('Distributing USDY fees...');
    const tx5 = await feeDistributor.distributeFees(CONTRACTS.testUSDY);
    await tx5.wait();
    console.log('USDY distributed!');
  }

  console.log('\n=== Done! Fee distribution complete ===');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
