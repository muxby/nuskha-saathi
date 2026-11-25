import type { Metadata, Viewport } from "next";
import { Inter, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const nastaliq = Noto_Nastaliq_Urdu({ subsets: ["arabic"], variable: "--font-urdu", display: "swap" });

export const metadata: Metadata = {
  title: "نسخہ ساتھی | Nuskha Saathi",
  description: "پرچی سمجھیں، دوا کا وقت دیکھیں، حفاظتی انتباہ سنیں۔",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Nuskha Saathi" },
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#131D38", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" dir="ltr" className={`${inter.variable} ${nastaliq.variable}`}><body><LanguageProvider>{children}</LanguageProvider></body></html>;
}
