# 🔧 DNS Ayarları - stableswap.arc.testnet

## ⚠️ Mevcut Durum
Domain: `stableswap.arc.testnet`  
Durum: **Invalid Configuration** ❌  
Nameserver'lar: Third Party (Vercel'e yönlendirilmemiş)

## ✅ Çözüm Seçenekleri

### Seçenek 1: A Record Ekle (Önerilen) ⭐

DNS provider'ınızda (domain'inizi aldığınız yer) şu kaydı ekleyin:

```
Type: A
Name: stableswap.arc (veya stableswap)
Value: 76.76.21.21
TTL: 3600 (veya otomatik)
```

**Adımlar:**
1. Domain provider'ınıza giriş yapın (örn: Namecheap, GoDaddy, Cloudflare)
2. DNS Management bölümüne gidin
3. A Record ekleyin:
   - **Host/Name**: `stableswap` (veya `stableswap.arc`)
   - **Type**: `A`
   - **Value/IP**: `76.76.21.21`
   - **TTL**: `3600` veya otomatik
4. Kaydedin
5. 5-10 dakika bekleyin (DNS propagation)
6. Vercel otomatik olarak doğrulayacak

### Seçenek 2: Nameserver Değiştir

DNS provider'ınızda nameserver'ları değiştirin:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Adımlar:**
1. Domain provider'ınıza giriş yapın
2. Nameserver ayarlarına gidin
3. Şu nameserver'ları ekleyin:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`
4. Kaydedin
5. 24-48 saat bekle (DNS propagation daha uzun)

## 🔍 DNS Provider'a Göre Kılavuz

### Cloudflare:
1. Domain'i seçin
2. DNS > Records
3. Add record:
   - Type: A
   - Name: stableswap
   - IPv4: 76.76.21.21
   - Proxy: Off (DNS Only)
   - Save

### Namecheap:
1. Domain List > Manage
2. Advanced DNS
3. Add New Record:
   - Type: A Record
   - Host: stableswap
   - Value: 76.76.21.21
   - TTL: Automatic
   - Save

### GoDaddy:
1. My Products > DNS
2. Records > Add
   - Type: A
   - Name: stableswap
   - Value: 76.76.21.21
   - TTL: 600 seconds
   - Save

## ✅ Doğrulama

DNS ayarlarını yaptıktan sonra:

```bash
# Terminal'de kontrol et
dig stableswap.arc.testnet +short
# Çıktı: 76.76.21.21 olmalı

# Veya Vercel CLI ile
vercel domains verify stableswap.arc.testnet
```

Vercel otomatik olarak doğrulayacak ve email gönderecek.

## 📝 Notlar

- DNS propagation 5 dakika - 48 saat arasında sürebilir
- Genellikle 5-15 dakika içinde çalışır
- Vercel otomatik SSL sertifikası verecek (Let's Encrypt)
- HTTPS otomatik aktif olacak

## 🆘 Sorun Giderme

Eğer hala çalışmıyorsa:
1. DNS cache'i temizle: `nslookup stableswap.arc.testnet`
2. Vercel dashboard'da "Refresh" butonuna tıkla
3. 24 saat sonra tekrar kontrol et
4. Vercel support'a başvur

## 📧 Email Bildirimi

DNS doğrulandığında Vercel otomatik email gönderecek.
