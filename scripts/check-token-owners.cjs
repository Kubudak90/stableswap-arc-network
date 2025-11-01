const hre = require("hardhat");

async function main() {
  const testUSDC = "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733";
  const testUSDT = "0x787804d1f98F4Da65C6de63AaA00906A8C6868F3";
  const testUSDY = "0x4D81e87902aA4Cf67D99055D44b6D0341fCc419a";
  const developerAddress = "0x1D58328205429D39cE21a13DcD3FeB73180C9B20";
  
  const OWNER_ABI = ["function owner() view returns (address)"];
  const provider = new hre.ethers.JsonRpcProvider("https://rpc.testnet.arc.network");
  
  const usdcContract = new hre.ethers.Contract(testUSDC, OWNER_ABI, provider);
  const usdtContract = new hre.ethers.Contract(testUSDT, OWNER_ABI, provider);
  const usdyContract = new hre.ethers.Contract(testUSDY, OWNER_ABI, provider);
  
  const usdcOwner = await usdcContract.owner();
  const usdtOwner = await usdtContract.owner();
  const usdyOwner = await usdyContract.owner();
  
  console.log("\n=== Token Owners ===");
  console.log("TestUSDCV2 owner:", usdcOwner);
  console.log("TestUSDTV2 owner:", usdtOwner);
  console.log("TestUSDYV2 owner:", usdyOwner);
  console.log("\nDeveloper address:", developerAddress);
  console.log("\nDeveloper is owner?", 
    usdcOwner.toLowerCase() === developerAddress.toLowerCase() &&
    usdtOwner.toLowerCase() === developerAddress.toLowerCase() &&
    usdyOwner.toLowerCase() === developerAddress.toLowerCase()
  );
}

main().catch(console.error);
