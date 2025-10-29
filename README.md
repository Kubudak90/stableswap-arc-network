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
- **Test Token Faucet**: 24 saatte bir 1000 tUSDC + 1000 tUSDT
- **Router**: Kolay kullanım için yardımcı kontrat
- **Modern Frontend**: React + Vite ile responsive arayüz

## 📁 Proje Yapısı

```
stableswap/
├── contracts/           # Solidity kontratları
│   ├── LPToken.sol     # LP token kontratı
│   ├── StableSwapPool.sol # Ana havuz kontratı
│   ├── SimpleSwap.sol  # Basit swap kontratı
│   ├── TestTokenFaucet.sol # Test token faucet
│   ├── Router.sol      # Router kontratı
│   ├── TestUSDC.sol    # Test USDC token
│   └── TestUSDT.sol    # Test USDT token
├── scripts/            # Deploy scriptleri
│   ├── deploy.cjs     # Ana deploy scripti
│   ├── deploy-faucet.cjs # Faucet deploy scripti
│   └── transfer-big-amount.cjs # Token transfer scripti
├── frontend/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── SwapPanel.jsx
│   │   │   ├── PoolPanel.jsx
│   │   │   ├── FaucetPanel.jsx
│   │   │   └── Header.jsx
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

## 🌐 Frontend Deployment

Frontend'i production'a deploy etmek için birkaç seçenek var:

### Seçenek 1: Vercel (Önerilen) ⭐

1. **Vercel CLI ile**:
```bash
npm i -g vercel
cd frontend
vercel --prod
```

2. **GitHub ile**:
   - GitHub repo'yu https://vercel.com adresine bağla
   - Otomatik deploy yapılacak
   - Her push'ta otomatik güncellenir

### Seçenek 2: Netlify

1. **Drag & Drop**:
   - `frontend/dist` klasörünü https://app.netlify.com adresine sürükle
   - Otomatik deploy yapılacak

2. **GitHub ile**:
   - GitHub repo'yu Netlify'e bağla
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/dist`

### Seçenek 3: GitHub Pages

1. **Build yap**:
```bash
cd frontend
npm install
npm run build
```

2. **GitHub'a push et**:
```bash
git add frontend/dist
git commit -m "Deploy frontend"
git push
```

3. **GitHub Settings**:
   - Settings > Pages > Source: `frontend/dist`
   - Custom domain ekleyebilirsin

### Production Build

```bash
cd frontend
npm install
npm run build
```

Build edilen dosyalar `frontend/dist` klasöründe olacak.

## 📊 Kontrat Detayları

### Deployed Contracts (Arc Testnet)

- **StableSwap**: `0xab9743e9715FFb5C5FC11Eb203937edA0C00c105` ⭐ (1:1 oran)
- **SimpleSwap**: `0x665A82180fa7a58e2efeF5270cC2c2974087A030` (Eski)
- **TestUSDC**: `0x53646C53e712cE320182E289E7364d4d0e4D6D01`
- **TestUSDT**: `0x2587521Ca49A69813991E9076B6eFbBb5CbfD19E`
- **TestTokenFaucet**: `0x1809123f52ebE8f80e328D99a16Ee42D679B2bA6`

### StableSwap

- **Fee**: 4 bps (0.04%) - Stabilcoin için optimize edilmiş
- **Oran**: 1:1 (Sabit) - Stabilcoinler için ideal
- **Math**: Basit 1:1 takas + fee
- **Scaling**: 6 decimals for test tokens

### SimpleSwap (Deprecated)

- **Fee**: 30 bps (0.3%) - Uniswap V2 benzeri
- **Math**: Constant product formula (x * y = k)
- **Scaling**: 6 decimals for test tokens

### TestTokenFaucet

- **Amount**: 1000 tUSDC + 1000 tUSDT per claim
- **Cooldown**: 24 hours between claims
- **Admin**: Emergency withdraw functions

### Router

- `addLiquidity()`: Likidite ekleme
- `removeLiquidity()`: Likidite çıkarma  
- `swapExactTokensForTokens()`: Token takası

## 🔧 Kullanım

### Test Token Alma (Faucet)

1. **Frontend'e git**: http://localhost:3000/faucet
2. **Wallet bağla**: MetaMask ile Arc Testnet'e bağlan
3. **Token al**: 24 saatte bir 1000 tUSDC + 1000 tUSDT

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
