import "../src/styles.css";

export const metadata = {
  title: "Ayvatullu Ev Boya",
  description: "Ev fotoğrafları için boya renk simülatörü",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f5f2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
