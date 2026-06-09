import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prode Mundialista N360",
  description: "Pronosticá los partidos del Mundial 2026 y competí con tus amigos",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/icon-512.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Prode N360" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');`
        }} />
      </body>
    </html>
  );
}
