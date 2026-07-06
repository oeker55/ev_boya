# Ayvatullu Ev Boya

Bu proje, ev boyama çalışmaları için renkleri tek bir ev fotoğrafına uygulamak üzere hazırlanmış statik bir web aracıdır.

- Renk verisi kartela kaynağından alınır: https://biancastella.com.tr/kartela/
- Sabit fotoğraf yolu: `public/ev.jpg`
- Cephe maskelerini açıp kapatabilir, dış çizgiyi ve pencere/kapı boşluklarını sürükleyerek ayarlayabilirsin.
- Seçili rengi PNG olarak indirebilirsin.

Yerel çalıştırma:

```powershell
npm run dev
```

Sonra tarayıcıdan `http://localhost:5173` adresini aç.

Netlify ayarı `netlify.toml` içinde hazırdır: build komutu `npm run build`, yayın klasörü `dist`.
