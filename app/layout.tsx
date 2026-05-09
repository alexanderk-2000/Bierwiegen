import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bierwiegen — Premium Trinkspiel",
  description:
    "Das Trinkspiel für Waage, Zielgewicht und schlechte Entscheidungen. Premium Bier-Bar — online & offline.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bierwiegen"
  }
};

export const viewport: Viewport = {
  themeColor: "#c8932b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body className="relative">{children}</body>
    </html>
  );
}
