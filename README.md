# Ayvatullu Ev Boya

Next.js + MongoDB tabanlı ev boya renk simülatörü.

- Public kullanıcılar `/resimId` adresinden ilgili resmi görür.
- Admin paneli `/admin` adresindedir.
- Login bilgileri MongoDB `users` koleksiyonundan doğrulanır.
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

## İlk Admin Kullanıcı

`users` koleksiyonu boşsa ilk login denemesinde aşağıdaki env değerleriyle admin kullanıcı otomatik oluşturulur:

```txt
ADMIN_USERNAME=admin
ADMIN_PASSWORD=...
```

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
ADMIN_USERNAME=admin
ADMIN_PASSWORD=...
SESSION_SECRET=...
MAX_UPLOAD_BYTES=10485760
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.5
```

Build komutu:

```txt
npm run build
```
