// scripts/deploy-full-system.js
// Full system deployment: tokens, pools, faucet, rewards setup
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("=".repeat(60));
  console.log("FULL SYSTEM DEPLOYMENT");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);

  // Existing contracts (don't redeploy)
  const ASS_TOKEN = "0xe56151c58780ebB54e32257B3426a6Bc15e46C3C";
  const FEE_DISTRIBUTOR = "0x9d5EC576F616Dc30CB8e743a6D5334F376ff8D58";
  const STAKING_CONTRACT = "0x57Ca9Fff43CeFe73413C07e9a45453F5eC8D5bBD";

  // Target address for initial mint
  const TARGET = "0x9F6E9F044D3F0470438c525a3dB6CECdFE6f1A6A";

  // ============================================
  // 1. DEPLOY TEST TOKENS (6 decimals)
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("1. DEPLOYING TEST TOKENS");
  console.log("=".repeat(60));

  const MintableTestToken = await hre.ethers.getContractFactory("MintableTestToken");

  console.log("Deploying tUSDC...");
  const tUSDC = await MintableTestToken.deploy("Test USDC", "tUSDC", 6);
  await tUSDC.waitForDeployment();
  const tUSDCAddr = await tUSDC.getAddress();
  console.log("tUSDC:", tUSDCAddr);

  console.log("Deploying tUSDT...");
  const tUSDT = await MintableTestToken.deploy("Test USDT", "tUSDT", 6);
  await tUSDT.waitForDeployment();
  const tUSDTAddr = await tUSDT.getAddress();
  console.log("tUSDT:", tUSDTAddr);

  console.log("Deploying tUSDY...");
  const tUSDY = await MintableTestToken.deploy("Test USDY", "tUSDY", 6);
  await tUSDY.waitForDeployment();
  const tUSDYAddr = await tUSDY.getAddress();
  console.log("tUSDY:", tUSDYAddr);

  // ============================================
  // 2. DEPLOY SWAP POOLS
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("2. DEPLOYING SWAP POOLS");
  console.log("=".repeat(60));

  const A = 100; // Amplification
  const feeBps = 4; // 0.04% fee
  const adminFeeBps = 5000; // 50% of fees to FeeDistributor

  // 2Pool V2
  console.log("Deploying 2Pool V2...");
  const StableSwapPoolV2 = await hre.ethers.getContractFactory("StableSwapPoolV2");
  const pool2 = await StableSwapPoolV2.deploy(
    tUSDCAddr, tUSDTAddr, 6, 6, A, feeBps, adminFeeBps, FEE_DISTRIBUTOR, deployer.address
  );
  await pool2.waitForDeployment();
  const pool2Addr = await pool2.getAddress();
  const lp2Addr = await pool2.lp();
  console.log("2Pool V2:", pool2Addr);
  console.log("LP 2Pool:", lp2Addr);

  // 3Pool V2
  console.log("Deploying 3Pool V2...");
  const StableSwap3PoolV2 = await hre.ethers.getContractFactory("StableSwap3PoolV2");
  const pool3 = await StableSwap3PoolV2.deploy(
    tUSDCAddr, tUSDTAddr, tUSDYAddr, 6, 6, 6, feeBps, adminFeeBps, FEE_DISTRIBUTOR, deployer.address
  );
  await pool3.waitForDeployment();
  const pool3Addr = await pool3.getAddress();
  const lp3Addr = await pool3.lp();
  console.log("3Pool V2:", pool3Addr);
  console.log("LP 3Pool:", lp3Addr);

  // ============================================
  // 3. DEPLOY FAUCET
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("3. DEPLOYING FAUCET");
  console.log("=".repeat(60));

  const TestTokenFaucetV3 = await hre.ethers.getContractFactory("TestTokenFaucetV3");
  const faucet = await TestTokenFaucetV3.deploy(tUSDCAddr, tUSDTAddr, tUSDYAddr);
  await faucet.waitForDeployment();
  const faucetAddr = await faucet.getAddress();
  console.log("Faucet V3:", faucetAddr);

  // Add faucet as minter
  console.log("Adding faucet as minter...");
  await (await tUSDC.addMinter(faucetAddr)).wait();
  await (await tUSDT.addMinter(faucetAddr)).wait();
  await (await tUSDY.addMinter(faucetAddr)).wait();
  console.log("Faucet can now mint tokens");

  // Add deployer and target as developers (no cooldown)
  console.log("Adding developers...");
  await (await faucet.addDeveloper(deployer.address)).wait();
  await (await faucet.addDeveloper(TARGET)).wait();
  console.log("Developers added");

  // ============================================
  // 4. DEPLOY LIQUIDITY REWARDS
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("4. DEPLOYING LIQUIDITY REWARDS");
  console.log("=".repeat(60));

  const LiquidityRewards = await hre.ethers.getContractFactory("LiquidityRewards");
  const liquidityRewards = await LiquidityRewards.deploy(ASS_TOKEN);
  await liquidityRewards.waitForDeployment();
  const lrAddr = await liquidityRewards.getAddress();
  console.log("LiquidityRewards:", lrAddr);

  // Add pools
  console.log("Adding LP pools...");
  await (await liquidityRewards.addPool(lp2Addr, 100)).wait();
  console.log("2Pool LP added (Pool ID: 0, 100 alloc)");
  await (await liquidityRewards.addPool(lp3Addr, 150)).wait();
  console.log("3Pool LP added (Pool ID: 1, 150 alloc)");

  // ============================================
  // 5. SETUP PERMISSIONS
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("5. SETTING UP PERMISSIONS");
  console.log("=".repeat(60));

  // Set LiquidityRewards on ASSToken
  const assToken = await hre.ethers.getContractAt(
    ["function setLiquidityRewards(address) external", "function liquidityRewards() view returns (address)"],
    ASS_TOKEN, deployer
  );
  console.log("Setting LiquidityRewards on ASSToken...");
  await (await assToken.setLiquidityRewards(lrAddr)).wait();
  console.log("LiquidityRewards authorized to mint ASS");

  // Register pools in FeeDistributor
  const feeDistributor = await hre.ethers.getContractAt(
    ["function addSwapContract(address) external", "function isSwapContract(address) view returns (bool)"],
    FEE_DISTRIBUTOR, deployer
  );
  console.log("Registering pools in FeeDistributor...");
  await (await feeDistributor.addSwapContract(pool2Addr)).wait();
  await (await feeDistributor.addSwapContract(pool3Addr)).wait();
  console.log("Pools registered");

  // ============================================
  // 6. MINT INITIAL TOKENS
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("6. MINTING INITIAL TOKENS");
  console.log("=".repeat(60));

  const MINT_AMOUNT = hre.ethers.parseUnits("10000000", 6); // 10M each

  // Mint to faucet
  console.log("Minting 10M each to Faucet...");
  await (await tUSDC.mint(faucetAddr, MINT_AMOUNT)).wait();
  await (await tUSDT.mint(faucetAddr, MINT_AMOUNT)).wait();
  await (await tUSDY.mint(faucetAddr, MINT_AMOUNT)).wait();
  console.log("Faucet funded");

  // Mint to target address
  console.log("Minting 5M each to target:", TARGET);
  const TARGET_AMOUNT = hre.ethers.parseUnits("5000000", 6);
  await (await tUSDC.mint(TARGET, TARGET_AMOUNT)).wait();
  await (await tUSDT.mint(TARGET, TARGET_AMOUNT)).wait();
  await (await tUSDY.mint(TARGET, TARGET_AMOUNT)).wait();
  console.log("Target funded");

  // Mint to deployer for initial liquidity
  console.log("Minting 1M each to deployer for initial liquidity...");
  const DEPLOYER_AMOUNT = hre.ethers.parseUnits("1000000", 6);
  await (await tUSDC.mint(deployer.address, DEPLOYER_AMOUNT)).wait();
  await (await tUSDT.mint(deployer.address, DEPLOYER_AMOUNT)).wait();
  await (await tUSDY.mint(deployer.address, DEPLOYER_AMOUNT)).wait();
  console.log("Deployer funded");

  // ============================================
  // 7. ADD INITIAL LIQUIDITY
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("7. ADDING INITIAL LIQUIDITY");
  console.log("=".repeat(60));

  const LIQUIDITY_AMOUNT = hre.ethers.parseUnits("100000", 6); // 100K each

  // Approve tokens
  console.log("Approving tokens...");
  await (await tUSDC.approve(pool2Addr, LIQUIDITY_AMOUNT)).wait();
  await (await tUSDT.approve(pool2Addr, LIQUIDITY_AMOUNT)).wait();
  await (await tUSDC.approve(pool3Addr, LIQUIDITY_AMOUNT)).wait();
  await (await tUSDT.approve(pool3Addr, LIQUIDITY_AMOUNT)).wait();
  await (await tUSDY.approve(pool3Addr, LIQUIDITY_AMOUNT)).wait();

  // Add liquidity to 2Pool
  console.log("Adding liquidity to 2Pool (100K each)...");
  await (await pool2.addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT, 0)).wait();
  console.log("2Pool liquidity added");

  // Add liquidity to 3Pool
  console.log("Adding liquidity to 3Pool (100K each)...");
  await (await pool3.addLiquidity(LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT, LIQUIDITY_AMOUNT, 0)).wait();
  console.log("3Pool liquidity added");

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));

  console.log("\n--- Test Tokens (6 decimals) ---");
  console.log(`tUSDC: '${tUSDCAddr}'`);
  console.log(`tUSDT: '${tUSDTAddr}'`);
  console.log(`tUSDY: '${tUSDYAddr}'`);

  console.log("\n--- Swap Pools ---");
  console.log(`2Pool V2: '${pool2Addr}'`);
  console.log(`3Pool V2: '${pool3Addr}'`);

  console.log("\n--- LP Tokens ---");
  console.log(`LP 2Pool: '${lp2Addr}'`);
  console.log(`LP 3Pool: '${lp3Addr}'`);

  console.log("\n--- Infrastructure ---");
  console.log(`Faucet V3: '${faucetAddr}'`);
  console.log(`LiquidityRewards: '${lrAddr}'`);

  console.log("\n--- Existing (unchanged) ---");
  console.log(`ASS Token: '${ASS_TOKEN}'`);
  console.log(`FeeDistributor: '${FEE_DISTRIBUTOR}'`);
  console.log(`StakingContract: '${STAKING_CONTRACT}'`);

  console.log("\n" + "=".repeat(60));
  console.log("UPDATE frontend/src/config.js WITH:");
  console.log("=".repeat(60));
  console.log(`
  // Tokens
  testUSDC: '${tUSDCAddr}',
  testUSDT: '${tUSDTAddr}',
  testUSDY: '${tUSDYAddr}',

  // Swap Pools V2
  swap: '${pool2Addr}',
  swap3Pool: '${pool3Addr}',

  // LP Tokens V2
  lp2Pool: '${lp2Addr}',
  lp3Pool: '${lp3Addr}',

  // Infrastructure
  faucetV3: '${faucetAddr}',
  liquidityRewards: '${lrAddr}',
`);

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
