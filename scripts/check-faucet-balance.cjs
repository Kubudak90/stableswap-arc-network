const hre = require("hardhat");

async function main() {
  const faucetV2 = "0xd23bC9993699bAFa31fc626619ad73c43E032588";
  const testUSDC = "0x53646C53e712cE320182E289E7364d4d0e4D6D01";
  const testUSDT = "0x2587521Ca49A69813991E9076B6eFbBb5CbfD19E";
  const testUSDY = "0x54D12437404aD9a4E7506C4497711b21CCE3ABCd"; // App.jsx'ten alındı

  const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];

  const provider = new hre.ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
  
  const usdcContract = new hre.ethers.Contract(testUSDC, ERC20_ABI, provider);
  const usdtContract = new hre.ethers.Contract(testUSDT, ERC20_ABI, provider);
  const usdyContract = new hre.ethers.Contract(testUSDY, ERC20_ABI, provider);

  const usdcBalance = await usdcContract.balanceOf(faucetV2);
  const usdtBalance = await usdtContract.balanceOf(faucetV2);
  const usdyBalance = await usdyContract.balanceOf(faucetV2);

  console.log("\n=== Faucet V2 Balances ===");
  console.log("tUSDC:", hre.ethers.formatUnits(usdcBalance, 6));
  console.log("tUSDT:", hre.ethers.formatUnits(usdtBalance, 6));
  console.log("tUSDY:", hre.ethers.formatUnits(usdyBalance, 6));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
