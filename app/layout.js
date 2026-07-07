import Script from "next/script";
import "../src/styles.css";

export const metadata = {
  title: "Ayvatullu Ev Boya",
  description: "Ev fotoğrafları için boya renk simülatörü",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <Script
          src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
