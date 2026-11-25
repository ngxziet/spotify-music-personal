import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  applicationName: "SoundWave",
  title: "SoundWave - App Nghe Nhạc Cá Nhân & Offline",
  description:
    "Ứng dụng nghe nhạc cá nhân hiện đại, có thể cài đặt về máy, nghe nhạc MP3 offline, quản lý album và danh sách phát riêng.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SoundWave",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#121212",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full bg-black antialiased">
      <body className="h-full h-[100dvh] overflow-hidden bg-black text-white selection:bg-[#1ed760] selection:text-black">
        <AppShell version={process.env.VERCEL_DEPLOYMENT_ID || ''}>{children}</AppShell>
      </body>
    </html>
  );
}
