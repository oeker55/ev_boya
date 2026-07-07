# Ayvatullu Ev Boya

Ev fotoğrafları için renk önizleme ve maske düzenleme aracı.

- Public kullanıcılar `/resimId` adresinden sadece ilgili resmi ve renk denemesini görür.
- Admin paneli `/admin` adresindedir.
- Varsayılan admin bilgisi: `admin` / `evrenk2026`
- Upload edilen görseller `public/uploads` içine yazılır.
- Resim bazlı maske ve boya yoğunluğu ayarları `data/images.json` dosyasında tutulur.

Yerel çalıştırma:

```powershell
npm run dev
```

Sonra `http://localhost:5173` veya `http://localhost:5173/admin` adresini aç.

Build:

```powershell
npm run build
npm start
```

Admin bilgilerini build almadan önce `server.js` içinden veya `ADMIN_USERNAME` / `ADMIN_PASSWORD` ortam değişkenleriyle değiştirebilirsin.
