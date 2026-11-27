import type { Metadata, Viewport } from "next";
import {
  Inter,
  Newsreader,
  Noto_Naskh_Arabic,
  Noto_Nastaliq_Urdu,
  Plus_Jakarta_Sans,
} from "next/font/google";
import "./globals.css";
import "../styles/clinical-text.css";
import "../styles/results-summary.css";
import "../styles/day-plan.css";
import "../styles/results-polish.css";
import "../styles/connection.css";
import { LanguageProvider } from "@/lib/i18n";
import ServiceWorker from "@/components/ServiceWorker";
import ConnectionStatus from "@/components/ConnectionStatus";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});
const naskhUrdu = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-urdu-ui",
  display: "swap",
});
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-urdu",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nuskha Saathi | نسخہ ساتھی",
  description:
    "Read handwritten prescriptions clearly, check drug interactions, and hear daily doses in Urdu.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Nuskha Saathi" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#131D38",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${jakarta.variable} ${inter.variable} ${newsreader.variable} ${naskhUrdu.variable} ${nastaliq.variable}`}
    >
      <body>
        <LanguageProvider>
          <ConnectionStatus />
          {children}
        </LanguageProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
