import "../src/styles.css";

const siteUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const description =
  "Ev fotoğrafınızda 2000'den fazla Bianca Stella rengini anında deneyin, karşılaştırın ve paylaşın.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ayvatullu Ev Boya",
    template: "%s | Ayvatullu Ev Boya",
  },
  description,
  applicationName: "Ayvatullu Ev Boya",
  keywords: ["ev boya", "dış cephe rengi", "renk simülatörü", "Bianca Stella", "kartela"],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "Ayvatullu Ev Boya",
    title: "Ayvatullu Ev Boya",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Ayvatullu Ev Boya",
    description,
  },
  appleWebApp: {
    capable: true,
    title: "Ev Boya",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f4f5f2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
