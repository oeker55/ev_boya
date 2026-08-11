# Ayvatullu Ev Boya

Next.js + MongoDB tabanlı ev boya renk simülatörü.

- Public kullanıcılar `/resimId` adresinden ilgili resmi görür.
- Admin paneli `/admin` adresindedir.
- Kullanıcılar e-posta ve şifreyle kayıt olup giriş yapar.
- Şifre sıfırlama bağlantıları MongoDB'de süreli ve hash'lenmiş olarak saklanır.
- Resim ayarları MongoDB `images` koleksiyonunda tutulur.
- Upload edilen görseller MongoDB GridFS `uploads` bucket içinde saklanır.

## Yerel Çalıştırma

`.env.local` oluştur:

```powershell
Copy-Item .env.example .env.local
```

Mongo connection string içinde DB adını `painthouses` olarak yaz:

```txt
mongodb://USER:PASSWORD@HOST_1:27017,HOST_2:27017,HOST_3:27017/painthouses?ssl=true&replicaSet=...&authSource=admin
```

Sonra:

```powershell
npm run dev
```

Adresler:

- `http://localhost:3000`
- `http://localhost:3000/admin`

## Hesap İşlemleri

`/admin` ekranından e-posta ve şifreyle yeni hesap oluşturulabilir. Şifremi unuttum
akışı, `C:\Users\Ozgur\Desktop\email` projesinin kullandığı mail servisindeki
`/api/mail/send-test` uç noktasına bağlanır. Servis adresi `EMAIL_API_URL` ile değiştirilebilir.

## Eski JSON Verisini MongoDB'ye Aktarma

`.env.local` hazır olduktan sonra:

```powershell
npm run seed
```

Bu komut `data/images.json` içindeki ayarları MongoDB'ye taşır. `public/uploads` altındaki mevcut dosyaları da GridFS'e yükler.

## Vercel

Vercel build ayarlarında framework olarak Next.js otomatik algılanır.

Gerekli Environment Variables:

```txt
MONGODB_URI=...
MONGODB_DB=painthouses
SESSION_SECRET=...
APP_URL=https://uygulama-adresi.example
EMAIL_API_URL=http://80.225.238.243:3000/api
MAX_UPLOAD_BYTES=10485760
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.5
```

Build komutu:

```txt
npm run build
```
