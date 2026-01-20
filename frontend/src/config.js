/**
 * StableSwap Arc Network - Configuration
 * All contract addresses and settings are loaded from environment variables
 */

// Network Configuration
export const NETWORK = {
  name: import.meta.env.VITE_NETWORK_NAME || 'Arc Testnet',
  chainId: parseInt(import.meta.env.VITE_CHAIN_ID || '5042002'),
  chainIdHex: '0x' + parseInt(import.meta.env.VITE_CHAIN_ID || '5042002').toString(16),
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://rpc.testnet.arc.network',
  explorerUrl: import.meta.env.VITE_EXPLORER_URL || 'https://testnet.arcscan.app',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18
  }
}

// Contract Addresses
export const CONTRACTS = {
  // Tokens (6 decimals - mintable)
  testUSDC: import.meta.env.VITE_TEST_USDC || '0x55A97f0A3BA1f192Cf333bac116bb75eCE5d176e',
  testUSDT: import.meta.env.VITE_TEST_USDT || '0xDBffb8fFF6492d4100DA3cC2E6775c21F7413d70',
  testUSDY: import.meta.env.VITE_TEST_USDY || '0x75979405a2955Cac025Ce95b852321b172B14a97',

  // Swap Pools V2 (with LP token + Fee Distribution to FeeDistributor)
  swap: import.meta.env.VITE_SWAP_2POOL || '0x81fEDF05DEaD9a49B4295B54201F4e35238fB59b',
  swap3Pool: import.meta.env.VITE_SWAP_3POOL || '0xE8513b949C9034Ce25712482bC0c622aFbbC9B7d',

  // LP Tokens V2
  lp2Pool: import.meta.env.VITE_LP_2POOL || '0xAF345f9e6BcD1D380f79e111D3Fd94615B61C733',
  lp3Pool: import.meta.env.VITE_LP_3POOL || '0x402Ca9FBc2770dC54FE4806DDe64f179388dfb88',

  // ASS Token Ecosystem
  assToken: import.meta.env.VITE_ASS_TOKEN || '0xe56151c58780ebB54e32257B3426a6Bc15e46C3C',
  liquidityRewards: import.meta.env.VITE_LIQUIDITY_REWARDS || '0xC15202674e180260d8832FA88a0f8a2346befcCD',
  stakingContract: import.meta.env.VITE_STAKING_CONTRACT || '0x57Ca9Fff43CeFe73413C07e9a45453F5eC8D5bBD',
  feeDistributor: import.meta.env.VITE_FEE_DISTRIBUTOR || '0x9d5EC576F616Dc30CB8e743a6D5334F376ff8D58',

  // Faucet
  faucetV3: import.meta.env.VITE_FAUCET_V3 || '0x20A2C2e424c490bC0459C6a1B865585F9949694b'
}

// Default Settings
export const SETTINGS = {
  defaultSlippage: parseInt(import.meta.env.VITE_DEFAULT_SLIPPAGE || '50'), // 0.5% in basis points
  maxSlippage: parseInt(import.meta.env.VITE_MAX_SLIPPAGE || '1000'), // 10% in basis points
  basisPoints: 10000
}

// Contract ABIs
export const ABIS = {
  // StableSwapPool ABI (2 tokens with LP)
  swap: [
    "function addLiquidity(uint256 amount0, uint256 amount1, uint256 minLpOut) external returns (uint256 lpOut)",
    "function removeLiquidity(uint256 lpAmount, uint256 min0, uint256 min1) external returns (uint256 amt0, uint256 amt1)",
    "function swap(bool zeroForOne, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut)",
    "function getReserves() external view returns (uint256, uint256)",
    "function getAmountOut(uint256 amountIn, bool zeroForOne) external view returns (uint256)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
    "function lp() external view returns (address)",
    "function pause() external",
    "function unpause() external",
    "function paused() external view returns (bool)"
  ],

  // StableSwap3PoolLP ABI (3 tokens with LP)
  swap3Pool: [
    "function addLiquidity(uint256 amount0, uint256 amount1, uint256 amount2, uint256 minLpOut) external returns (uint256 lpOut)",
    "function removeLiquidity(uint256 lpAmount, uint256 min0, uint256 min1, uint256 min2) external returns (uint256 amt0, uint256 amt1, uint256 amt2)",
    "function swap(uint8 tokenIn, uint8 tokenOut, uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut)",
    "function getReserves() external view returns (uint256, uint256, uint256)",
    "function getAmountOut(uint256 amountIn, uint8 tokenIn, uint8 tokenOut) external view returns (uint256)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)",
    "function token2() external view returns (address)",
    "function lp() external view returns (address)",
    "function pause() external",
    "function unpause() external",
    "function paused() external view returns (bool)"
  ],

  // ERC20 ABI
  erc20: [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function name() view returns (string)"
  ],

  // LiquidityRewards ABI
  liquidityRewards: [
    "function deposit(uint256 poolId, uint256 amount) external",
    "function withdraw(uint256 poolId, uint256 amount) external",
    "function claimRewards(uint256 poolId) external",
    "function pendingRewards(uint256 poolId, address user) external view returns (uint256)",
    "function userInfo(uint256 poolId, address user) external view returns (uint256 amount, uint256 rewardDebt, uint256 pendingRewards)",
    "function poolInfo(uint256 poolId) external view returns (address poolContract, uint256 allocPoint, uint256 lastRewardTime, uint256 accRewardPerShare, bool isActive)",
    "function pause() external",
    "function unpause() external",
    "function paused() external view returns (bool)"
  ],

  // FeeDistributor ABI
  feeDistributor: [
    "function distributeFees(address token) external",
    "function collectedFees(address swapContract) external view returns (uint256)",
    "function swapContracts(uint256) external view returns (address)",
    "function stakingContract() external view returns (address)",
    "function pause() external",
    "function unpause() external",
    "function paused() external view returns (bool)"
  ],

  // StakingContract ABI
  stakingContract: [
    "function stake(uint256 amount) external",
    "function unstake(uint256 amount) external",
    "function claimRewards() external",
    "function getPendingRewards(address user) external view returns (uint256)",
    "function stakers(address user) external view returns (uint256 stakedAmount, uint256 rewardDebt, uint256 pendingRewards)",
    "function totalStaked() external view returns (uint256)",
    "function rewardToken() external view returns (address)",
    "function pause() external",
    "function unpause() external",
    "function paused() external view returns (bool)"
  ],

  // Faucet ABI
  faucet: [
    "function claimTokens() external",
    "function lastClaimTime(address user) external view returns (uint256)",
    "function claimCooldown() external view returns (uint256)",
    "function canClaim(address user) external view returns (bool)"
  ]
}

// Token Info
export const TOKENS = {
  USDC: {
    symbol: 'tUSDC',
    name: 'Test USDC',
    decimals: 6,
    address: CONTRACTS.testUSDC
  },
  USDT: {
    symbol: 'tUSDT',
    name: 'Test USDT',
    decimals: 6,
    address: CONTRACTS.testUSDT
  },
  USDY: {
    symbol: 'tUSDY',
    name: 'Test USDY',
    decimals: 6,
    address: CONTRACTS.testUSDY
  },
  ASS: {
    symbol: 'ASS',
    name: 'Arc Stable Swap',
    decimals: 18,
    address: CONTRACTS.assToken
  }
}

// Utility functions
export const formatAmount = (amount, decimals = 18) => {
  if (!amount) return '0'
  const value = BigInt(amount)
  const divisor = BigInt(10 ** decimals)
  const intPart = value / divisor
  const decPart = value % divisor

  if (decPart === 0n) return intPart.toString()

  const decStr = decPart.toString().padStart(decimals, '0')
  // Remove trailing zeros but keep at least 2 decimal places for display
  const trimmed = decStr.replace(/0+$/, '')
  const display = trimmed.length < 2 ? trimmed.padEnd(2, '0') : trimmed.slice(0, 6)

  return `${intPart}.${display}`
}

export const parseAmount = (amount, decimals = 18) => {
  if (!amount || amount === '') return 0n

  const [intPart, decPart = ''] = amount.toString().split('.')
  const paddedDec = decPart.padEnd(decimals, '0').slice(0, decimals)

  return BigInt(intPart + paddedDec)
}

export const calculateMinOutput = (expectedOutput, slippageBps) => {
  const slippageFactor = BigInt(SETTINGS.basisPoints - slippageBps)
  return (BigInt(expectedOutput) * slippageFactor) / BigInt(SETTINGS.basisPoints)
}

export const getExplorerUrl = (txHash) => {
  return `${NETWORK.explorerUrl}/tx/${txHash}`
}

export const getAddressUrl = (address) => {
  return `${NETWORK.explorerUrl}/address/${address}`
}

export default {
  NETWORK,
  CONTRACTS,
  SETTINGS,
  ABIS,
  TOKENS,
  formatAmount,
  parseAmount,
  calculateMinOutput,
  getExplorerUrl,
  getAddressUrl
}
