import type { Metadata, Viewport } from "next";
import { DM_Sans, Noto_Sans_Devanagari, Sora } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/lang-context";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sora",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-devanagari",
});

export const metadata: Metadata = {
  title: "AgriPulse — AI-Powered Agricultural Market Intelligence",
  description:
    "Prescriptive agricultural intelligence system for crop price prediction, mandi recommendations, and smart selling decisions. फसल मूल्य पूर्वानुमान और मंडी सिफारिशें।",
};

export const viewport: Viewport = {
  themeColor: "#1a7a3f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${sora.variable} ${notoSansDevanagari.variable} min-h-screen font-sans antialiased`}
      >
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
