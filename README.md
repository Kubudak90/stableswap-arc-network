# 🔄 StableSwap AMM - Arc Network

[![Arc Network](https://img.shields.io/badge/Arc-Network-blue)](https://arc.network)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.19.0-yellow)](https://hardhat.org)

Arc Network üzerinde stabilcoin takası için Curve-inspired Automated Market Maker (AMM) protokolü. Bu proje Arc ekosistemi için geliştirilmiş açık kaynak bir DeFi protokolüdür.

## 🚀 Özellikler

- **Düşük Slippage**: Stabilcoinler arasında düşük kayma ile takas
- **Amplification Parametresi**: A=100 ile optimize edilmiş eğri
- **ERC20 LP Token**: Likidite sağlayıcıları için token temsili
- **Router**: Kolay kullanım için yardımcı kontrat
- **Modern Frontend**: React + Vite ile responsive arayüz

## 📁 Proje Yapısı

```
stableswap/
├── contracts/           # Solidity kontratları
│   ├── LPToken.sol     # LP token kontratı
│   ├── StableSwapPool.sol # Ana havuz kontratı
│   ├── Router.sol      # Router kontratı
│   ├── TestUSDC.sol    # Test USDC token
│   └── TestUSDT.sol    # Test USDT token
├── scripts/            # Deploy scriptleri
│   └── deploy.js      # Ana deploy scripti
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   └── App.jsx
│   └── package.json
├── hardhat.config.js  # Hardhat konfigürasyonu
└── package.json       # Ana proje dosyası
```

## 🛠️ Kurulum

### 1. Bağımlılıkları Yükle

```bash
npm install
cd frontend && npm install
```

### 2. Environment Variables

`.env` dosyası oluşturun:

```bash
cp env.example .env
```

`.env` dosyasını düzenleyin:

```env
ARC_RPC=https://rpc.testnet.arc.network
PRIVATE_KEY=0x... # Test cüzdan private key'i
```

### 3. Kontratları Derle

```bash
npm run compile
```

### 4. Arc Testnet'e Deploy Et

```bash
npm run deploy
```

### 5. Frontend'i Başlat

```bash
cd frontend
npm run dev
```

## 📊 Kontrat Detayları

### StableSwapPool

- **Amplification (A)**: 100 - stabilcoinler için optimize edilmiş
- **Fee**: 4 bps (0.04%) - düşük ücret oranı
- **Math**: Curve-inspired stableswap invariant
- **Scaling**: 1e18 fixed-point arithmetic

### Router

- `addLiquidity()`: Likidite ekleme
- `removeLiquidity()`: Likidite çıkarma  
- `swapExactTokensForTokens()`: Token takası

## 🔧 Kullanım

### Swap İşlemi

```javascript
// Token0 -> Token1 swap
await router.swapExactTokensForTokens(
  poolAddress,
  true,  // zeroForOne
  amountIn,
  minAmountOut
);
```

### Likidite Ekleme

```javascript
await router.addLiquidity(
  poolAddress,
  amount0,
  amount1,
  minLpOut
);
```

## 📈 Matematik

StableSwap invariant (2 token için):

```
A * n^n * Σ(x_i) + D = A * D * n^n + D^(n+1) / (n^n * Π(x_i))
```

Burada:
- A: Amplification parametresi
- n: Token sayısı (2)
- D: Invariant değeri
- x_i: Token bakiyeleri

## 🌐 Arc Network

- **RPC**: https://rpc.testnet.arc.network
- **Explorer**: https://explorer.testnet.arc.network
- **Faucet**: https://faucet.circle.com
- **Docs**: https://docs.arc.network
- **Twitter**: [@ArcNetwork](https://twitter.com/ArcNetwork)

### Arc Network Hakkında
Arc Network, Circle'ın CCTP (Cross-Chain Transfer Protocol) teknolojisini kullanan yeni nesil blockchain ağıdır. USDC native token olarak kullanılır ve düşük maliyetli, hızlı işlemler sunar.

## 📝 Notlar

- Bu bir MVP (Minimum Viable Product) implementasyonudur
- Production kullanımı için ek güvenlik önlemleri gerekebilir
- Oracle entegrasyonu gelecek versiyonlarda eklenebilir
- Multi-token havuzlar için genişletilebilir

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

MIT License - detaylar için `LICENSE` dosyasına bakın.
