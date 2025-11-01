const hre = require("hardhat");

async function main() {
  const faucetV2 = "0xd23bC9993699bAFa31fc626619ad73c43E032588";
  
  // Old token addresses
  const oldUSDC = "0x53646C53e712cE320182E289E7364d4d0e4D6D01";
  const oldUSDT = "0x2587521Ca49A69813991E9076B6eFbBb5CbfD19E";
  const oldUSDY = "0x54D12437404aD9a4E7506C4497711b21CCE3ABCd";
  
  // New mintable token addresses
  const newUSDC = "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733";
  const newUSDT = "0x787804d1f98F4Da65C6de63AaA00906A8C6868F3";
  const newUSDY = "0x4D81e87902aA4Cf67D99055D44b6D0341fCc419a";
  
  const ERC20_ABI = ["function balanceOf(address owner) view returns (uint256)"];
  const provider = new hre.ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
  
  console.log("\n=== Faucet V2 Balances ===");
  
  // Old tokens
  const oldUSDCContract = new hre.ethers.Contract(oldUSDC, ERC20_ABI, provider);
  const oldUSDTContract = new hre.ethers.Contract(oldUSDT, ERC20_ABI, provider);
  const oldUSDYContract = new hre.ethers.Contract(oldUSDY, ERC20_ABI, provider);
  
  const oldUSDCBal = await oldUSDCContract.balanceOf(faucetV2);
  const oldUSDTBal = await oldUSDTContract.balanceOf(faucetV2);
  const oldUSDYBal = await oldUSDYContract.balanceOf(faucetV2);
  
  console.log("\nOld Tokens:");
  console.log("  tUSDC:", hre.ethers.formatUnits(oldUSDCBal, 6));
  console.log("  tUSDT:", hre.ethers.formatUnits(oldUSDTBal, 6));
  console.log("  tUSDY:", hre.ethers.formatUnits(oldUSDYBal, 6));
  
  // New tokens
  const newUSDCContract = new hre.ethers.Contract(newUSDC, ERC20_ABI, provider);
  const newUSDTContract = new hre.ethers.Contract(newUSDT, ERC20_ABI, provider);
  const newUSDYContract = new hre.ethers.Contract(newUSDY, ERC20_ABI, provider);
  
  const newUSDCBal = await newUSDCContract.balanceOf(faucetV2);
  const newUSDTBal = await newUSDTContract.balanceOf(faucetV2);
  const newUSDYBal = await newUSDYContract.balanceOf(faucetV2);
  
  console.log("\nNew Mintable Tokens:");
  console.log("  tUSDC:", hre.ethers.formatUnits(newUSDCBal, 6));
  console.log("  tUSDT:", hre.ethers.formatUnits(newUSDTBal, 6));
  console.log("  tUSDY:", hre.ethers.formatUnits(newUSDYBal, 6));
  
  console.log("\nToplam (Old + New):");
  console.log("  tUSDC:", hre.ethers.formatUnits(oldUSDCBal + newUSDCBal, 6));
  console.log("  tUSDT:", hre.ethers.formatUnits(oldUSDTBal + newUSDTBal, 6));
  console.log("  tUSDY:", hre.ethers.formatUnits(oldUSDYBal + newUSDYBal, 6));
}

main().catch(console.error);
