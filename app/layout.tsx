import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { CONFIG } from "@/lib/config";

// font di-host sendiri oleh Next.js (tanpa request ke Google saat dibuka)
// pasangan "Luxury Serif": Cormorant untuk judul & surat, Montserrat untuk label kecil
const serif = Cormorant_Garamond({ weight: ["300", "400", "500", "600"], style: ["normal", "italic"], subsets: ["latin"], variable: "--font-cormorant" });
const sans = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });

// di Vercel, domain produksi otomatis tersedia → link preview (OG image) jadi URL absolut yang benar
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `Untuk ${CONFIG.istri}`,
  description: `Happy Anniversary, ${CONFIG.istri}. Ada sesuatu yang aku buat khusus buat kamu.`,
  robots: { index: false, follow: false }, // halaman pribadi, jangan muncul di Google
};

export const viewport: Viewport = {
  themeColor: "#0d0b0a",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${serif.variable} ${sans.variable}`}>
      {/* kunci scroll sebelum amplop dibuka diatur oleh ExperienceProvider (hanya halaman utama) */}
      <body>{children}</body>
    </html>
  );
}
