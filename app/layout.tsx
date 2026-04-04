import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/lang-context";

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
      <body className="min-h-screen font-sans antialiased">
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
