const hre = require("hardhat");
const fs = require('fs');

/**
 * Likidite Migrasyon Scripti
 * Eski pool'lardan yeni fee-aware pool'lara likiditeyi taşır
 */
async function main() {
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error("No signers found! Check PRIVATE_KEY in .env");
  }
  const deployer = signers[0];
  console.log("Deployer:", deployer.address);

  // Eski ve yeni kontrat adresleri
  const OLD_2POOL = "0xC4d8543f5b879eDe6885c43647E32e67Ca6DFC87";
  const NEW_2POOL = "0x5d4D4C908D7dfb882d5a24af713158FC805e410B";
  const OLD_3POOL = "0x34a0d6A10f26A31Ca2f7F71d4eA4B76F1Cbc2806";
  const NEW_3POOL = "0x16d14659A50fFB31571e4e7ac4417C1Ff22bFc70";

  const testUSDC = "0x1eccf89268C90C5Ac954ed020Ca498D96F9f9733";
  const testUSDT = "0x787804d1f98F4Da65C6de63AaA00906A8C6868F3";
  const testUSDY = "0x4D81e87902aA4Cf67D99055D44b6D0341fCc419a";

  // ABIs
  const SWAP_ABI = [
    "function getReserves() external view returns (uint256, uint256)",
    "function removeLiquidity(uint256 amount0, uint256 amount1) external",
    "function addLiquidity(uint256 amount0, uint256 amount1) external"
  ];

  const SWAP3POOL_ABI = [
    "function getReserves() external view returns (uint256, uint256, uint256)",
    "function removeLiquidity(uint256 amount0, uint256 amount1, uint256 amount2) external",
    "function addLiquidity(uint256 amount0, uint256 amount1, uint256 amount2) external"
  ];

  const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];

  console.log("\n=== Likidite Migrasyon Scripti ===\n");

  // 1. 2Pool Migrasyonu
  console.log("--- 2Pool Migrasyonu ---");
  const old2Pool = await hre.ethers.getContractAt(SWAP_ABI, OLD_2POOL);
  const new2Pool = await hre.ethers.getContractAt(SWAP_ABI, NEW_2POOL);

  try {
    // Eski pool'dan rezervleri al
    const [reserve0_old, reserve1_old] = await old2Pool.getReserves();
    console.log("Eski 2Pool rezervleri:");
    console.log(`  tUSDC: ${hre.ethers.formatUnits(reserve0_old, 6)}`);
    console.log(`  tUSDT: ${hre.ethers.formatUnits(reserve1_old, 6)}`);

      if (reserve0_old > 0n || reserve1_old > 0n) {
      console.log("\n⚠️  Eski pool'da likidite var!");
      console.log("NOT: Eski pool'larda ortak likidite var, tek bir kullanıcı tümünü çıkaramaz.");
      console.log("Her kullanıcı kendi eklediği likiditeyi çıkarmalı.\n");
      
      console.log("📋 Migrasyon Adımları:");
      console.log("1. Frontend'den eski pool'a gidin");
      console.log("2. 'Remove Liquidity' ile kendi likiditenizi çıkarın");
      console.log("3. Frontend'de yeni pool'a geçin (otomatik olarak yeni adresler kullanılacak)");
      console.log("4. 'Add Liquidity' ile likiditeyi yeni pool'a ekleyin\n");
      
      // Deployer'ın token bakiyelerini kontrol et
      const token0 = await hre.ethers.getContractAt(ERC20_ABI, testUSDC);
      const token1 = await hre.ethers.getContractAt(ERC20_ABI, testUSDT);

      const balance0 = await token0.balanceOf(deployer.address);
      const balance1 = await token1.balanceOf(deployer.address);

      console.log("Deployer token bakiyeleri:");
      console.log(`  tUSDC: ${hre.ethers.formatUnits(balance0, 6)}`);
      console.log(`  tUSDT: ${hre.ethers.formatUnits(balance1, 6)}`);

      // Eğer deployer'ın eski pool'da likiditesi yoksa, direkt yeni pool'a ekleyebilir
      console.log("\n💡 İpucu: Eğer yeni kullanıcıysanız, direkt yeni pool'a likidite ekleyebilirsiniz!");
      console.log("Frontend otomatik olarak yeni adresleri kullanıyor.\n");
    } else {
      console.log("✅ Eski 2Pool'da likidite yok, migrasyon gerekmiyor.");
      console.log("Direkt yeni pool'a likidite ekleyebilirsiniz.\n");
    }
  } catch (err) {
    console.error("❌ 2Pool migrasyon hatası:", err.message);
  }

  // 2. 3Pool Migrasyonu
  console.log("\n--- 3Pool Migrasyonu ---");
  const old3Pool = await hre.ethers.getContractAt(SWAP3POOL_ABI, OLD_3POOL);
  const new3Pool = await hre.ethers.getContractAt(SWAP3POOL_ABI, NEW_3POOL);

  try {
    // Eski pool'dan rezervleri al
    const [reserve0_old, reserve1_old, reserve2_old] = await old3Pool.getReserves();
    console.log("Eski 3Pool rezervleri:");
    console.log(`  tUSDC: ${hre.ethers.formatUnits(reserve0_old, 6)}`);
    console.log(`  tUSDT: ${hre.ethers.formatUnits(reserve1_old, 6)}`);
    console.log(`  tUSDY: ${hre.ethers.formatUnits(reserve2_old, 6)}`);

    if (reserve0_old > 0n || reserve1_old > 0n || reserve2_old > 0n) {
      console.log("\n⚠️  Eski pool'da likidite var!");
      console.log("NOT: Eski pool'larda ortak likidite var, tek bir kullanıcı tümünü çıkaramaz.");
      console.log("Her kullanıcı kendi eklediği likiditeyi çıkarmalı.\n");
      
      console.log("📋 Migrasyon Adımları:");
      console.log("1. Frontend'den eski 3Pool'a gidin");
      console.log("2. 'Remove Liquidity' ile kendi likiditenizi çıkarın");
      console.log("3. Frontend'de yeni 3Pool'a geçin (otomatik olarak yeni adresler kullanılacak)");
      console.log("4. 'Add Liquidity' ile likiditeyi yeni pool'a ekleyin\n");
    } else {
      console.log("✅ Eski 3Pool'da likidite yok, migrasyon gerekmiyor.");
      console.log("Direkt yeni pool'a likidite ekleyebilirsiniz.\n");
    }
  } catch (err) {
    console.error("❌ 3Pool migrasyon hatası:", err.message);
  }

  // 3. Yeni pool'ların durumu
  console.log("\n--- Yeni Pool'ların Durumu ---");
  try {
    const [reserve0_new, reserve1_new] = await new2Pool.getReserves();
    console.log("Yeni 2Pool rezervleri:");
    console.log(`  tUSDC: ${hre.ethers.formatUnits(reserve0_new, 6)}`);
    console.log(`  tUSDT: ${hre.ethers.formatUnits(reserve1_new, 6)}`);

    const [reserve0_3new, reserve1_3new, reserve2_3new] = await new3Pool.getReserves();
    console.log("\nYeni 3Pool rezervleri:");
    console.log(`  tUSDC: ${hre.ethers.formatUnits(reserve0_3new, 6)}`);
    console.log(`  tUSDT: ${hre.ethers.formatUnits(reserve1_3new, 6)}`);
    console.log(`  tUSDY: ${hre.ethers.formatUnits(reserve2_3new, 6)}`);
  } catch (err) {
    console.error("❌ Yeni pool durumu kontrolü hatası:", err.message);
  }

  console.log("\n=== Migrasyon Rehberi ===");
  console.log("\n📋 Manuel Migrasyon Adımları:");
  console.log("1. Frontend'e bağlan");
  console.log("2. Eski pool'lardan (eski adresler) likidite çıkar");
  console.log("3. Yeni pool'lara (yeni adresler) likidite ekle");
  console.log("\n💡 Otomatik Migrasyon:");
  console.log("Bu scripti her kullanıcı kendi adresi ile çalıştırabilir");
  console.log("veya frontend'den eski pool'lardan çıkıp yeni pool'lara ekleyebilir.\n");

  console.log("🔗 Kontrat Adresleri:");
  console.log("Eski 2Pool:", OLD_2POOL);
  console.log("Yeni 2Pool:", NEW_2POOL);
  console.log("Eski 3Pool:", OLD_3POOL);
  console.log("Yeni 3Pool:", NEW_3POOL);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

