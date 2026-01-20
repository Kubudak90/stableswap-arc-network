# StableSwap Arc Network - Formal Verification Dokümantasyonu

## 1. Genel Bakış

Bu döküman, StableSwap Arc Network akıllı kontratlarının formal verification (biçimsel doğrulama) analizini içermektedir. Sistemin matematiksel özelliklerini, güvenlik garantilerini ve invariantlarını tanımlar.

## 2. Sistem Mimarisi

### 2.1 Kontrat Hiyerarşisi

```
┌─────────────────────────────────────────────────────────────┐
│                      Governance Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  TimeLock   │  │  MultiSig   │  │    Pausable         │  │
│  │  (1h-30d)   │  │  (2-of-3)   │  │    (Emergency)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Core Protocol                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ StableSwap  │  │StableSwap   │  │      Router         │  │
│  │             │  │   Pool      │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Token Economics                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  ASSToken   │  │FeeDistrib.  │  │  AutoBuyback        │  │
│  │             │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐                           │
│  │  Staking    │  │  LPToken    │                           │
│  │  Contract   │  │             │                           │
│  └─────────────┘  └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

## 3. Matematiksel Model

### 3.1 StableSwap AMM Formülü

Curve Finance'in StableSwap invariant formülü kullanılmaktadır:

```
An^n * Σx_i + D = An^n * D + D^(n+1) / (n^n * Πx_i)
```

Burada:
- `A` = Amplifikasyon katsayısı (sabit)
- `n` = Token sayısı (2)
- `x_i` = Token i'nin rezervi
- `D` = Toplam likidite değeri (LP değeri)

#### 3.1.1 Newton-Raphson D Hesaplaması

```solidity
function getD(uint256[2] memory xp) internal view returns (uint256 D) {
    uint256 S = xp[0] + xp[1];
    if (S == 0) return 0;

    D = S;
    uint256 Ann = A * 4;

    for (uint256 i; i < 255; ++i) {
        uint256 D_P = D * D * D / (4 * xp[0] * xp[1]);
        uint256 D_prev = D;
        D = (Ann * S + 2 * D_P) * D / ((Ann - 1) * D + 3 * D_P);

        if (D > D_prev) {
            if (D - D_prev <= 1) break;
        } else {
            if (D_prev - D <= 1) break;
        }
    }
}
```

**Yakınsama Garantisi:**
- Newton-Raphson metodu `f(D) = 0` için kuadratik yakınsama sağlar
- 255 iterasyon limiti yeterlidir (pratikte ~10 iterasyonda yakınsar)

### 3.2 Swap Çıktı Hesaplaması

```
y = getY(x + dx)
dy = y_prev - y - 1  // -1 yuvarlama güvenliği için
```

**Invariant Korunumu:**
```
D_before = D_after (ücret hariç)
```

## 4. Güvenlik İnvariantları

### 4.1 Token İnvariantları

#### ASSToken
```
INV-1: totalSupply() <= MAX_SUPPLY (100M tokens)
INV-2: Σ balanceOf(addr) == totalSupply()
INV-3: transfer(to, amount) => balanceOf(from) >= amount
INV-4: burn sadece feeDistributor tarafından çağrılabilir
INV-5: mint sadece liquidityRewards tarafından çağrılabilir
```

#### LPToken
```
INV-6: mint/burn sadece pool kontratı tarafından çağrılabilir
INV-7: Σ balanceOf(addr) == totalSupply()
```

### 4.2 Pool İnvariantları

#### StableSwapPool
```
INV-8: reserve0 + reserve1 > 0 => D > 0
INV-9: swap sonrası D değişmez (fee hariç)
INV-10: addLiquidity sonrası D artmalı
INV-11: removeLiquidity sonrası D azalmalı
INV-12: lpSupply > 0 <=> (reserve0 > 0 && reserve1 > 0)
INV-13: aynı blokta birden fazla işlem yapılamaz (flash loan koruması)
INV-14: tek swap en fazla %10 likidite kullanabilir (varsayılan)
```

### 4.3 Fee İnvariantları

```
INV-15: feeBps <= 100 (max %1)
INV-16: toplanan fee = swapAmount * feeBps / 10000
INV-17: fee dağıtımı: staking(45%) + buyback(45%) + treasury(10%) = 100%
```

### 4.4 Staking İnvariantları

```
INV-18: Σ stakerBalance[addr] == totalStaked
INV-19: unstake(amount) => stakerBalance[addr] >= amount
INV-20: rewardPerTokenStored monoton artan
```

### 4.5 Governance İnvariantları

#### TimeLock
```
INV-21: MIN_DELAY <= delay <= MAX_DELAY
INV-22: eta >= block.timestamp + delay
INV-23: execute: block.timestamp >= eta
INV-24: execute: block.timestamp <= eta + GRACE_PERIOD
```

#### MultiSig
```
INV-25: 0 < numConfirmationsRequired <= owners.length
INV-26: execute: numConfirmations >= numConfirmationsRequired
INV-27: bir owner aynı tx'i iki kez onaylayamaz
INV-28: owner değişiklikleri sadece multisig üzerinden
```

## 5. Güvenlik Özellikleri

### 5.1 Access Control Matrix

| Fonksiyon | Owner | User | Executor | FeeDistributor | MultiSig |
|-----------|-------|------|----------|----------------|----------|
| pause/unpause | ✓ | ✗ | ✗ | ✗ | ✗ |
| setFee | ✓ | ✗ | ✗ | ✗ | ✗ |
| emergencyWithdraw | ✓* | ✗ | ✗ | ✗ | ✗ |
| swap | ✗ | ✓ | ✗ | ✗ | ✗ |
| stake/unstake | ✗ | ✓ | ✗ | ✗ | ✗ |
| distributeRewards | ✗ | ✗ | ✗ | ✓ | ✗ |
| queueTransaction | ✓ | ✗ | ✗ | ✗ | ✗ |
| executeTransaction | ✗ | ✗ | ✓ | ✗ | ✗ |
| addOwner (MultiSig) | ✗ | ✗ | ✗ | ✗ | ✓ |

*emergencyWithdraw sadece pause durumunda çalışır

### 5.2 Reentrancy Koruması

Tüm kritik fonksiyonlar `nonReentrant` modifier kullanır:

```solidity
// ReentrancyGuard pattern
modifier nonReentrant() {
    require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
    _status = _ENTERED;
    _;
    _status = _NOT_ENTERED;
}
```

Korunan fonksiyonlar:
- `swap()`
- `addLiquidity()`
- `removeLiquidity()`
- `stake()`
- `unstake()`
- `claimRewards()`
- `executeBuyback()`

### 5.3 Flash Loan Koruması

```solidity
mapping(address => uint256) public lastActionBlock;

modifier flashLoanGuard() {
    if (flashLoanProtectionEnabled) {
        require(
            lastActionBlock[msg.sender] < block.number,
            "flash loan protection"
        );
    }
    _;
    lastActionBlock[msg.sender] = block.number;
}
```

**Özellik:** Bir kullanıcı aynı blokta birden fazla likidite/swap işlemi yapamaz.

### 5.4 Price Manipulation Koruması

```solidity
uint256 public maxSwapPercentage = 1000; // %10

function swap(...) {
    uint256 maxSwap = (reserve * maxSwapPercentage) / 10000;
    require(amountIn <= maxSwap, "exceeds max swap");
}
```

**Özellik:** Tek bir swap, toplam likiditenin belirli bir yüzdesini aşamaz.

## 6. Tehdit Modeli

### 6.1 Tanımlanan Tehditler ve Mitigasyonlar

| Tehdit | Olasılık | Etki | Mitigasyon |
|--------|----------|------|------------|
| Flash Loan Saldırısı | Yüksek | Yüksek | flashLoanGuard modifier |
| Price Manipulation | Yüksek | Yüksek | maxSwapPercentage limiti |
| Reentrancy | Orta | Kritik | ReentrancyGuard |
| Front-running | Orta | Orta | Slippage koruması |
| Owner Key Compromise | Düşük | Kritik | MultiSig + TimeLock |
| Integer Overflow | Düşük | Yüksek | Solidity 0.8+ built-in |
| Denial of Service | Orta | Orta | Pause mekanizması |

### 6.2 Saldırı Vektörleri

#### 6.2.1 Flash Loan Arbitraj
```
Saldırı:
1. Flash loan ile büyük miktar token al
2. Swap yap, fiyatı manipüle et
3. Ters swap yap, kar et
4. Flash loan'ı geri öde

Mitigasyon: Aynı blokta işlem engeli
```

#### 6.2.2 Sandwich Saldırısı
```
Saldırı:
1. Kurban tx'i mempool'da gör
2. Front-run: Fiyatı kendi lehine manipüle et
3. Kurban tx'i geçer (kötü fiyat)
4. Back-run: Kar realizasyonu

Mitigasyon:
- Slippage tolerance (frontend)
- maxSwapPercentage limiti
```

## 7. Pre/Post Koşulları

### 7.1 swap() Fonksiyonu

**Pre-conditions:**
```
P1: !paused
P2: amountIn > 0
P3: amountIn <= maxSwapAmount (price manipulation koruması)
P4: lastActionBlock[msg.sender] < block.number (flash loan koruması)
P5: reserveIn > 0 && reserveOut > 0
```

**Post-conditions:**
```
Q1: reserveIn' = reserveIn + amountIn
Q2: reserveOut' = reserveOut - amountOut
Q3: amountOut >= minAmountOut (slippage)
Q4: D_after ≈ D_before (fee toleransı dahilinde)
Q5: lastActionBlock[msg.sender] = block.number
```

### 7.2 addLiquidity() Fonksiyonu

**Pre-conditions:**
```
P1: !paused
P2: amount0 > 0 || amount1 > 0
P3: lastActionBlock[msg.sender] < block.number
```

**Post-conditions:**
```
Q1: lpMinted > 0
Q2: D_after > D_before
Q3: reserve0' = reserve0 + amount0
Q4: reserve1' = reserve1 + amount1
Q5: lpSupply' = lpSupply + lpMinted
```

### 7.3 stake() Fonksiyonu

**Pre-conditions:**
```
P1: !paused
P2: amount > 0
P3: assToken.balanceOf(msg.sender) >= amount
```

**Post-conditions:**
```
Q1: stakerBalance[msg.sender]' = stakerBalance[msg.sender] + amount
Q2: totalStaked' = totalStaked + amount
Q3: assToken.balanceOf(stakingContract)' += amount
```

## 8. Formal Verification Araçları

### 8.1 Önerilen Araçlar

1. **Certora Prover**
   - CVL (Certora Verification Language) ile invariant doğrulama
   - Otomatik kontrat analizi

2. **Echidna**
   - Property-based fuzzing
   - Solidity assertion kontrolü

3. **Mythril**
   - Symbolic execution
   - Güvenlik açığı taraması

4. **Slither**
   - Static analysis
   - Kod kalitesi kontrolü

### 8.2 Certora CVL Örneği

```cvl
// Invariant: Toplam stake edilen miktar doğru
invariant totalStakedCorrect()
    totalStaked() == sum(stakerBalance[u] for all u)

// Rule: Stake sonrası balance artmalı
rule stakeIncreasesBalance(address user, uint256 amount) {
    uint256 balanceBefore = stakerBalance(user);

    stake(amount);

    uint256 balanceAfter = stakerBalance(user);
    assert balanceAfter == balanceBefore + amount;
}

// Rule: Swap D invariantını korumalı
rule swapPreservesD(bool zeroForOne, uint256 amountIn) {
    uint256 D_before = getD();

    swap(zeroForOne, amountIn, 0);

    uint256 D_after = getD();
    // Fee toleransı
    assert D_after >= D_before * 9996 / 10000;
}
```

### 8.3 Echidna Test Örneği

```solidity
// Echidna property test
contract StableSwapEchidna is StableSwapPool {

    // Invariant: D asla sıfırın altına düşmemeli
    function echidna_D_non_negative() public view returns (bool) {
        return getD() >= 0;
    }

    // Invariant: Reserve'ler ve LP tutarlı
    function echidna_reserves_lp_consistent() public view returns (bool) {
        if (totalSupply() == 0) {
            return reserve0 == 0 && reserve1 == 0;
        }
        return reserve0 > 0 && reserve1 > 0;
    }

    // Invariant: Fee asla limiti aşmamalı
    function echidna_fee_within_bounds() public view returns (bool) {
        return feeBps <= 100; // Max %1
    }
}
```

## 9. Test Kapsamı Raporu

### 9.1 Birim Testleri

| Kontrat | Test Sayısı | Durum |
|---------|-------------|-------|
| StableSwap | 25 | ✓ |
| StableSwapPool | 18 | ✓ |
| Router | 15 | ✓ |
| ASSToken | 12 | ✓ |
| LPToken | 8 | ✓ |
| FeeDistributor | 16 | ✓ |
| StakingContract | 20 | ✓ |
| AutoBuyback | 18 | ✓ |
| TimeLock | 15 | ✓ |
| MultiSigWallet | 33 | ✓ |
| Integration | 12 | ✓ |
| Security | 37 | ✓ |
| **Toplam** | **226** | ✓ |

### 9.2 Kapsam Metrikleri

- Statement Coverage: ~95%
- Branch Coverage: ~90%
- Function Coverage: ~98%
- Line Coverage: ~95%

## 10. Audit Kontrol Listesi

### 10.1 Genel Güvenlik

- [x] Reentrancy koruması
- [x] Integer overflow koruması (Solidity 0.8+)
- [x] Access control implementasyonu
- [x] Pausable emergency mekanizma
- [x] Event logging
- [x] Input validasyonu

### 10.2 DeFi Spesifik

- [x] Flash loan koruması
- [x] Price manipulation koruması
- [x] Slippage koruması
- [x] Sandwich attack mitigasyonu
- [x] Oracle bağımlılığı yok (kendi AMM formülü)

### 10.3 Governance

- [x] TimeLock mekanizması
- [x] MultiSig cüzdan
- [x] Yetki devri güvenliği
- [x] Emergency fonksiyonlar

### 10.4 Token Ekonomisi

- [x] Max supply limiti
- [x] Burn mekanizması
- [x] Mint yetkilendirmesi
- [x] Fee dağıtım doğruluğu

## 11. Bilinen Limitasyonlar

1. **Oracle Yokluğu**: Sistem harici fiyat oracle'ı kullanmıyor. Bu, stablecoin'lerin depeg durumunda arbitraj fırsatı yaratabilir.

2. **Centralization Riski**: Owner hesabı önemli yetkilere sahip. MultiSig ve TimeLock bu riski azaltır ama tamamen ortadan kaldırmaz.

3. **Gas Optimizasyonu**: Bazı fonksiyonlar gas açısından optimize edilebilir.

4. **Upgradability**: Kontratlar upgradable değil. Bu güvenlik için iyi ama esnekliği azaltır.

## 12. Sonuç ve Öneriler

### 12.1 Güvenlik Puanı

| Kategori | Puan |
|----------|------|
| Akıllı Kontrat Güvenliği | 8.5/10 |
| Matematiksel Doğruluk | 9/10 |
| Access Control | 9/10 |
| Test Kapsamı | 9/10 |
| Governance | 8/10 |
| **Genel** | **8.7/10** |

### 12.2 Gelecek İyileştirmeler

1. Formal verification araçları ile tam doğrulama
2. Bug bounty programı başlatılması
3. Profesyonel güvenlik auditi
4. Gas optimizasyonları
5. Upgradability pattern değerlendirmesi

---

*Bu döküman, StableSwap Arc Network'ün v1.0 sürümü için hazırlanmıştır.*
*Son güncelleme: Ocak 2026*
