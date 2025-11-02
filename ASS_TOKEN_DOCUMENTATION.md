# ASS Token (Arc Stable Swap) - Dökümantasyon

## Genel Bakış

ASS Token, Arc Stable Swap platformunun native token'ıdır. **%100 community owned** bir tokenomics modeli ile tasarlanmıştır. Token sadece platform fee'lerinden mint edilir ve hiçbir presale veya private sale yapılmaz.

## Token Bilgileri

- **İsim**: Arc Stable Swap
- **Sembol**: ASS
- **Total Supply**: Başlangıçta 0 (sadece fee'lerden mint edilir)
- **Mint Mekanizması**: Sadece fee distribution sistemi tarafından
- **Burn Mekanizması**: Buyback'in %90'ı otomatik olarak yakılır

## Tokenomics Modeli

### Fee Dağılımı

Platform üzerindeki tüm swap işlemlerinden toplanan fee'ler (0.04%) şu şekilde dağıtılır:

```
Swap Fee (0.04%)
├── %45 → ASS Staker'lara (Staking Rewards)
├── %45 → Buyback
│   ├── %10 → Maaş (Developer Salary)
│   └── %90 → Burn (Token Yakma)
└── %10 → Treasury (DAO Kontrolünde)
```

### Detaylı Açıklama

#### 1. Staker Rewards (%45)
- Tüm swap fee'lerinin %45'i ASS token stake eden kullanıcılara dağıtılır
- Reward'lar stablecoin (USDC/USDT) olarak ödenir
- Staking süresi ve minimum stake miktarı yoktur
- Reward'lar stake edilen miktar ile orantılı olarak dağıtılır

#### 2. Buyback (%45)
Buyback mekanizması iki aşamadan oluşur:

**Maaş (%4.5 = Buyback'in %10'u)**
- Buyback bütçesinin %10'u geliştiricinin maaşı olarak ödenir
- Bu para direkt olarak salary address'ine gönderilir

**Burn (%40.5 = Buyback'in %90'ı)**
- Kalan %90'ı ASS token alımı ve yakma için kullanılır
- Stablecoin'ler ile ASS token satın alınır ve yakılır
- Bu mekanizma token arzını azaltarak değer artışı sağlar

#### 3. Treasury (%10)
- Platform geliştirmeleri ve iyileştirmeleri için rezerve edilir
- DAO (Decentralized Autonomous Organization) tarafından kontrol edilir
- Gelecekte DAO oylamaları ile kullanım kararları alınacaktır

## Akıllı Kontratlar

### 1. ASSToken.sol

ERC20 token kontratı. OpenZeppelin'in ERC20, ERC20Burnable ve Ownable kontratlarını kullanır.

**Özellikler:**
- Sadece fee distributor tarafından mint edilebilir
- Token yakılabilir (burn edilebilir)
- Owner tarafından fee distributor ve staking contract adresleri ayarlanabilir

**Fonksiyonlar:**
- `mint(address to, uint256 amount)`: Fee distributor tarafından token mint etme
- `setFeeDistributor(address)`: Fee distributor adresini ayarlama
- `setStakingContract(address)`: Staking contract adresini ayarlama

### 2. FeeDistributor.sol

Swap fee'lerini toplayan ve dağıtan merkezi kontrat.

**Özellikler:**
- Birden fazla swap kontratından fee toplayabilir
- Otomatik fee dağıtımı
- Buyback ve burn mekanizması
- Configurable adresler (treasury, salary, staking contract)

**Fonksiyonlar:**
- `collectFee(address token, uint256 amount)`: Swap kontratlarından fee toplama
- `distributeFees(address token)`: Toplanan fee'leri dağıtma
- `addSwapContract(address)`: Yeni swap kontratı ekleme
- `removeSwapContract(address)`: Swap kontratı kaldırma
- `setStakingContract(address)`: Staking contract adresini ayarlama
- `setTreasury(address)`: Treasury adresini güncelleme
- `setSalaryAddress(address)`: Maaş adresini güncelleme

**Fee Dağıtım Süreci:**
1. Swap işlemleri sırasında fee'ler `FeeDistributor` kontratına gönderilir
2. `collectFee()` fonksiyonu ile fee'ler kaydedilir
3. `distributeFees()` çağrıldığında:
   - %45 staking contract'a gönderilir
   - %45 buyback için ayrılır (bunun %10'u maaş, %90'ı burn)
   - %10 treasury'ye gönderilir

### 3. StakingContract.sol

ASS token stake etme ve reward alma kontratı.

**Özellikler:**
- ASS token stake etme
- Stablecoin (USDC/USDT) olarak reward alma
- Proportiyonel reward dağıtımı
- Anında unstake (kilitleme yok)

**Fonksiyonlar:**
- `stake(uint256 amount)`: ASS token stake etme
- `unstake(uint256 amount)`: Stake'ten çıkma
- `claimRewards()`: Bekleyen reward'ları claim etme
- `distributeRewards(uint256 amount)`: Fee distributor'dan reward dağıtımı
- `getPendingRewards(address)`: Bekleyen reward'ı görüntüleme
- `getStakerInfo(address)`: Staker bilgilerini görüntüleme

**Reward Mekanizması:**
- Fee distributor, toplanan fee'lerin %45'ini staking contract'a gönderir
- Staking contract bu stablecoin'leri stake edenlere orantılı olarak dağıtır
- Reward'lar anında claim edilebilir

### 4. StableSwapWithFees.sol

Fee distribution entegrasyonlu swap kontratı.

**Özellikler:**
- Mevcut StableSwap kontratının fee-aware versiyonu
- Swap işlemleri sırasında otomatik fee toplama
- FeeDistributor ile entegre

**Swap Süreci:**
1. Kullanıcı swap yapar
2. Fee hesaplanır (0.04%)
3. Fee direkt FeeDistributor'a gönderilir
4. Kalan miktar swap edilir

## Deploy Süreci

### Gereksinimler

1. `.env` dosyasında `PRIVATE_KEY` tanımlı olmalı
2. Arc Testnet RPC URL'i `hardhat.config.js`'de tanımlı olmalı
3. Yeterli test ETH'e sahip olmalısınız

### Deploy Komutu

```bash
npx hardhat run scripts/deploy-ass-token.cjs --network arcTestnet
```

### Deploy Sonrası

Deploy edilen adresler `ass-token-addresses.json` dosyasına kaydedilir. Bu dosyayı kontrol ederek:

1. ASS Token adresini doğrulayın
2. FeeDistributor'ın doğru yapılandırıldığını kontrol edin
3. Staking contract'ın bağlantılarını doğrulayın
4. Mevcut swap kontratlarının FeeDistributor'a eklendiğini kontrol edin

### Önemli Notlar

⚠️ **Mevcut StableSwap Kontratları**
- Mevcut `StableSwap.sol` ve `StableSwap3Pool.sol` kontratları fee distribution'a entegre edilmemiştir
- İki seçenek vardır:
  1. `StableSwapWithFees.sol` kullanarak yeni kontratlar deploy edin
  2. Mevcut kontratları upgrade edin (Proxy pattern kullanarak)

⚠️ **Treasury Kontrolü**
- Treasury adresi başlangıçta deployer adresi olarak ayarlanır
- Gelecekte DAO'ya transfer edilebilir

⚠️ **Buyback Mekanizması**
- Şu anda buyback basit bir transfer olarak implemente edilmiştir
- İleride DEX entegrasyonu yapılarak otomatik ASS alımı ve burn yapılabilir

## Kullanım Senaryoları

### 1. Swap Yapma

Kullanıcı swap yaptığında:
1. Swap işlemi gerçekleşir
2. Fee otomatik olarak FeeDistributor'a gönderilir
3. Fee'ler birikir ve `distributeFees()` çağrıldığında dağıtılır

### 2. ASS Token Stake Etme

1. ASS token satın alın (ilk aşamada henüz ASS token yok - pool'larda teşvik verilecek)
2. `StakingContract.stake(amount)` çağrılır
3. Token'lar stake edilir ve reward'lar birikmeye başlar

### 3. Reward Claim Etme

1. Staking contract'ta biriken reward'ları kontrol edin
2. `StakingContract.claimRewards()` çağrılır
3. Stablecoin reward'lar cüzdanınıza transfer edilir

### 4. Fee Dağıtımı

1. Yeterli fee biriktiğinde `FeeDistributor.distributeFees(tokenAddress)` çağrılır
2. Fee'ler otomatik olarak:
   - Staking contract'a gönderilir (%45)
   - Buyback için ayrılır (%45)
   - Treasury'ye gönderilir (%10)

## Güvenlik Notları

1. **Ownable Kontratlar**: ASS Token, FeeDistributor ve StakingContract Ownable'dır. Owner yetkileri dikkatli kullanılmalıdır.

2. **Fee Distributor Yetkisi**: Sadece kayıtlı swap kontratları fee gönderebilir.

3. **Mint Yetkisi**: ASS Token sadece FeeDistributor tarafından mint edilebilir.

4. **Treasury Kontrolü**: Treasury adresi DAO'ya transfer edilerek merkeziyetten kurtarılabilir.

## Gelecek Geliştirmeler

- [ ] Buyback için DEX entegrasyonu (otomatik ASS alımı ve burn)
- [ ] DAO governance token'ı (Treasury kontrolü için)
- [ ] Time-weighted staking rewards
- [ ] Vesting mekanizması (pool teşvikleri için)
- [ ] Multi-signature wallet entegrasyonu
- [ ] Frontend entegrasyonu

## Sorular ve Destek

Sorularınız için GitHub Issues açabilir veya doğrudan iletişime geçebilirsiniz.

---

**Not**: Bu dokümantasyon testnet deployment için hazırlanmıştır. Mainnet deployment öncesi güvenlik audit'i yapılmalıdır.

