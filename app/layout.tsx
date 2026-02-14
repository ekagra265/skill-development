import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgriPulse - AI-Powered Agricultural Market Intelligence",
  description:
    "Prescriptive agricultural intelligence system for crop price prediction, mandi recommendations, and smart selling decisions.",
};

export const viewport: Viewport = {
  themeColor: "#16803c",
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
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
