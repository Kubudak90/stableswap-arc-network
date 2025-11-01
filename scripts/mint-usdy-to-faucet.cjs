const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  const faucetV2 = "0xd23bC9993699bAFa31fc626619ad73c43E032588";
  const testUSDYV2 = "0x4D81e87902aA4Cf67D99055D44b6D0341fCc419a";
  
  const ERC20_ABI = [
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)",
    "function mint(address to, uint256 amount) external"
  ];
  
  const usdyContract = new hre.ethers.Contract(testUSDYV2, ERC20_ABI, deployer);
  
  // Check balance
  const deployerBalance = await usdyContract.balanceOf(deployer.address);
  console.log("Deployer USDY balance:", hre.ethers.formatUnits(deployerBalance, 6));
  
  // Mint if needed
  if (deployerBalance < hre.ethers.parseUnits("5000000", 6)) {
    console.log("Minting 5M USDY to deployer...");
    await usdyContract.mint(deployer.address, hre.ethers.parseUnits("5000000", 6));
    console.log("✅ Minted");
  }
  
  // Transfer to faucet
  console.log("Transferring 5M USDY to faucet...");
  await usdyContract.transfer(faucetV2, hre.ethers.parseUnits("5000000", 6));
  console.log("✅ Transferred");
  
  const faucetBalance = await usdyContract.balanceOf(faucetV2);
  console.log("Faucet USDY balance:", hre.ethers.formatUnits(faucetBalance, 6));
}

main().catch(console.error);
