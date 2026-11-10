import type { Metadata, Viewport } from "next";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Bierwiegen — Premium Trinkspiel",
    template: "%s · Bierwiegen"
  },
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
  themeColor: "#fffaf0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: das Inline-Script setzt die .dark-Klasse vor der Hydration.
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="relative">
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
