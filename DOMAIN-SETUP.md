# 🔗 Domain Bağlama - arcstableswap.app

## ✅ Mevcut Durum
- **Domain**: `arcstableswap.app`
- **Registrar**: Vercel
- **Nameserver'lar**: ✅ Doğru ayarlanmış
- **Durum**: Vercel'de kayıtlı ama projeye bağlı değil

## 📋 Domain'i Projeye Bağlama

### Yöntem 1: Vercel Dashboard (Önerilen) ⭐

1. **Vercel Dashboard'a git**: https://vercel.com/kubudak90s-projects/frontend
2. **Settings** sekmesine tıkla
3. **Domains** sekmesine tıkla
4. **"Add Domain"** butonuna tıkla
5. Domain adını gir: `arcstableswap.app`
6. **"Add"** butonuna tıkla
7. **Production** environment'ı seç (otomatik seçilir)
8. **Save** butonuna tıkla

### Yöntem 2: Vercel CLI

```bash
cd frontend
vercel domains add arcstableswap.app
```

**Not**: Domain başka bir projeye atanmışsa önce o projeden kaldırılmalı.

## ✅ Doğrulama

Domain bağlandıktan sonra:

1. **5-10 dakika bekle** (DNS propagation)
2. **Test et**: https://arcstableswap.app
3. **SSL Sertifikası**: Otomatik olarak Let's Encrypt ile gelecek
4. **HTTPS**: Otomatik aktif olacak

## 🌐 Sonuç

Domain bağlandıktan sonra:
- ✅ `https://arcstableswap.app` çalışacak
- ✅ SSL sertifikası otomatik gelecek
- ✅ Her deployment'ta otomatik güncellenecek

## 🆘 Sorun Giderme

**Domain bağlanamıyorsa:**
1. Vercel dashboard'da domain'in hangi projeye bağlı olduğunu kontrol et
2. O projeden kaldır, sonra frontend projesine ekle
3. Nameserver'ları kontrol et (zaten doğru)
4. 24 saat bekle ve tekrar dene

## 📧 Bildirim

Domain bağlandığında Vercel email gönderecek.
