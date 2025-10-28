const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Contract addresses
  const swapAddress = "0x665A82180fa7a58e2efeF5270cC2c2974087A030";
  const token0Address = "0x53646C53e712cE320182E289E7364d4d0e4D6D01";
  const token1Address = "0x2587521Ca49A69813991E9076B6eFbBb5CbfD19E";

  // SimpleSwap ABI
  const SWAP_ABI = [
    "function addLiquidity(uint256 amount0, uint256 amount1) external",
    "function swap(bool zeroForOne, uint256 amountIn) external returns (uint256 amountOut)",
    "function getReserves() external view returns (uint256, uint256)",
    "function token0() external view returns (address)",
    "function token1() external view returns (address)"
  ];

  // ERC20 ABI
  const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  const swapContract = new hre.ethers.Contract(swapAddress, SWAP_ABI, deployer);
  const token0Contract = new hre.ethers.Contract(token0Address, ERC20_ABI, deployer);
  const token1Contract = new hre.ethers.Contract(token1Address, ERC20_ABI, deployer);

  console.log("=== Contract Test ===");
  
  try {
    // Test getReserves
    const [reserve0, reserve1] = await swapContract.getReserves();
    console.log("✅ getReserves works:", hre.ethers.formatUnits(reserve0, 6), hre.ethers.formatUnits(reserve1, 6));
    
    // Test token addresses
    const token0 = await swapContract.token0();
    const token1 = await swapContract.token1();
    console.log("✅ token0:", token0);
    console.log("✅ token1:", token1);
    
    // Test balances
    const balance0 = await token0Contract.balanceOf(deployer.address);
    const balance1 = await token1Contract.balanceOf(deployer.address);
    console.log("✅ Deployer balances:", hre.ethers.formatUnits(balance0, 6), hre.ethers.formatUnits(balance1, 6));
    
    // Test allowance
    const allowance0 = await token0Contract.allowance(deployer.address, swapAddress);
    const allowance1 = await token1Contract.allowance(deployer.address, swapAddress);
    console.log("✅ Allowances:", hre.ethers.formatUnits(allowance0, 6), hre.ethers.formatUnits(allowance1, 6));
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
