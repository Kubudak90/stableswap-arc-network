# StableSwap V2 Deployment Instructions

## Yeni StableSwap Kontratı Deploy Etme

Yeni StableSwap kontratı `removeLiquidity` fonksiyonu ile güncellendi. Deploy etmek için:

### 1. .env Dosyası Oluştur

```bash
cp env.example .env
```

Sonra `.env` dosyasına PRIVATE_KEY'inizi ekleyin:
```
PRIVATE_KEY=0x...
```

### 2. Yeni Kontratı Deploy Et

```bash
npx hardhat run scripts/deploy-stableswap-v2.cjs --network arcTestnet
```

Bu komut çalıştığında:
- Yeni StableSwap V2 kontratı deploy edilecek
- Adres `stableswap-v2-addresses.json` dosyasına kaydedilecek

### 3. Frontend'i Güncelle

Deploy sonrası `stableswap-v2-addresses.json` dosyasındaki yeni adresi alın ve `frontend/src/App.jsx` dosyasında güncelleyin:

```javascript
const CONTRACTS = {
  // ...
  swap: "YENI_ADRES_BURAYA", // StableSwap V2 (with removeLiquidity)
  // ...
}
```

### 4. Eski Kontrat'tan Likidite Transfer

⚠️ **ÖNEMLİ:** Eski kontrat (`0xC8B54F9085FCA8F45cc461002A8bd381D1240a47`) üzerindeki likidite otomatik olarak yeni kontrata geçmez.

Eğer eski kontrat üzerinde likidite varsa:
1. Eski kontrat henüz `removeLiquidity` desteklemiyor, bu yüzden likidite transfer edilemez
2. Yeni kontrata baştan likidite eklemeniz gerekecek

### Notlar

- Yeni kontrat eski kontratla tamamen ayrı bir kontrattır
- Eski kontrat adresini kullanmaya devam edebilirsiniz (removeLiquidity olmadan)
- Veya yeni kontrat adresine geçebilirsiniz (removeLiquidity ile)

