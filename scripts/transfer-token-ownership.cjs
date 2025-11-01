const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  const developerAddress = "0x1D58328205429D39cE21a13DcD3FeB73180C9B20";
  
  console.log("Deployer:", deployer.address);
  console.log("Transferring ownership to developer:", developerAddress);

  const testUSDC = "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733";
  const testUSDT = "0x787804d1f98F4Da65C6de63AaA00906A8C6868F3";
  const testUSDY = "0x4D81e87902aA4Cf67D99055D44b6D0341fCc419a";

  const OWNER_ABI = ["function transferOwnership(address newOwner) external"];
  
  const TestUSDCV2 = await hre.ethers.getContractFactory("TestUSDCV2");
  const TestUSDTV2 = await hre.ethers.getContractFactory("TestUSDTV2");
  const TestUSDYV2 = await hre.ethers.getContractFactory("TestUSDYV2");
  
  const usdcContract = TestUSDCV2.attach(testUSDC);
  const usdtContract = TestUSDTV2.attach(testUSDT);
  const usdyContract = TestUSDYV2.attach(testUSDY);

  console.log("\n=== Transferring Ownership ===");
  
  const tx1 = await usdcContract.transferOwnership(developerAddress);
  await tx1.wait();
  console.log("✅ TestUSDCV2 ownership transferred");

  const tx2 = await usdtContract.transferOwnership(developerAddress);
  await tx2.wait();
  console.log("✅ TestUSDTV2 ownership transferred");

  const tx3 = await usdyContract.transferOwnership(developerAddress);
  await tx3.wait();
  console.log("✅ TestUSDYV2 ownership transferred");

  console.log("\n🎉 All token ownerships transferred to developer!");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
