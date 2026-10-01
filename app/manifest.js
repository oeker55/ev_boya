export default function manifest() {
  return {
    name: "Ayvatullu Ev Boya",
    short_name: "Ev Boya",
    description: "Ev fotoğrafınızda Bianca Stella renklerini anında deneyin.",
    lang: "tr",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f2",
    theme_color: "#f4f5f2",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
