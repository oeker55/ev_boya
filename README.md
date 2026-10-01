# Ayvatullu Ev Boya

Next.js + MongoDB tabanlı ev boya renk simülatörü. Ziyaretçiler bir ev fotoğrafı üzerinde
Bianca Stella kartelasındaki renkleri deneyebilir; yöneticiler fotoğraf yükleyip boya
alanlarını (maskeleri) çizer veya AI ile oluşturur.

- Public görünüm: `/` (varsayılan resim) ve `/<resimId>`
- Yönetim paneli: `/admin`
- Resim ayarları MongoDB `images` koleksiyonunda, yüklenen dosyalar GridFS `uploads`
  bucket'ında saklanır.
- Şifre sıfırlama bağlantıları süreli ve hash'lenmiş olarak saklanır.

## Özellikler

- 2000'den fazla Bianca Stella rengi; ad, kod veya hex ile arama ve seri filtresi
- Ana ve ikinci renk alanları, renkleri tek tek otomatik uygulama
- Fotoğrafa basılı tutarak orijinal ile boyalı hâli karşılaştırma
- Seçili renk bağlantıda saklanır (`?renk=90021&ikinci=94543`), böylece paylaşılan link aynı
  görünümü açar
- Mobilde yerel paylaşım menüsüyle (WhatsApp vb.) boyalı görseli gönderme, PNG indirme
- Son seçilen renkler satırı, kurulabilir web uygulaması (manifest + ikonlar), Open Graph görseli

## Gereksinimler

- Node.js 20.9 veya üzeri
- MongoDB (Atlas veya kendi sunucunuz)

## Yerel Çalıştırma

```powershell
npm install
Copy-Item .env.example .env.local
```

`.env.local` içindeki `MONGODB_URI` değerini kendi bağlantınızla değiştirin; veritabanı adı
`painthouses` olmalıdır. Ardından:

```powershell
npm run dev
```

Uygulama `http://localhost:3000` adresinde, yönetim paneli `http://localhost:3000/admin`
adresinde açılır.

## Hesaplar ve Yetki

Kayıt herkese açık değildir; kayıt olan her hesap yönetici yetkisi aldığı için sınırlandırılmıştır.
Bir e-posta adresi şu durumlardan birinde kayıt olabilir:

1. Veritabanında henüz hiç kullanıcı yoksa (ilk kurulum),
2. Adres `ADMIN_EMAILS` listesindeyse (virgülle ayrılmış),
3. `ALLOW_PUBLIC_REGISTRATION=true` ayarlanmışsa.

Giriş, kayıt ve şifre sıfırlama uç noktaları kötüye kullanıma karşı istek sınırına sahiptir
(MongoDB `rateLimits` koleksiyonu, kayıtlar süre dolunca otomatik silinir).

Şifremi unuttum akışı, `EMAIL_API_URL` ile belirtilen e-posta servisinin
`/mail/send-test` uç noktasını kullanır.

## Eski JSON Verisini MongoDB'ye Aktarma

`.env.local` hazır olduktan sonra:

```powershell
npm run seed
```

Bu komut `data/images.json` içindeki ayarları MongoDB'ye taşır ve `public/uploads` altındaki
dosyaları GridFS'e yükler. `ADMIN_EMAIL` ve `ADMIN_PASSWORD` tanımlıysa bu bilgilerle bir
yönetici hesabı da oluşturur.

## Komutlar

| Komut                  | Açıklama                                   |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Geliştirme sunucusu                        |
| `npm run build`        | Production derlemesi                       |
| `npm start`            | Derlenmiş uygulamayı çalıştırır            |
| `npm test`             | Playwright smoke testleri (Chrome gerekir) |
| `npm run format`       | Kodu Prettier ile biçimlendirir            |
| `npm run format:check` | Biçimlendirmeyi kontrol eder               |
| `npm run seed`         | JSON verisini ve yönetici hesabını aktarır |

Yönetici girişini de kapsayan testi çalıştırmak için `MONGODB_URI`, `TEST_USER_EMAIL` ve
`TEST_USER_PASSWORD` ortam değişkenlerini tanımlayın; aksi halde bu test atlanır.

## Vercel

Framework olarak Next.js otomatik algılanır. Gerekli ortam değişkenleri:

```txt
MONGODB_URI=...
MONGODB_DB=painthouses
SESSION_SECRET=...            # zorunlu, uzun ve rastgele
APP_URL=https://uygulama-adresi.example
ADMIN_EMAILS=yonetici@ornek.com
EMAIL_API_URL=...
MAX_UPLOAD_BYTES=4194304      # Vercel istek gövdesi sınırı ~4.5 MB
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.5
```
