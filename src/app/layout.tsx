import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Spotify - Web Nghe Nhạc Cá Nhân",
  description: "Web nghe nhạc cá nhân hiện đại phong cách Spotify, tải nhạc MP3 offline, quản lý album và danh sách phát riêng.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Spotify",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#121212",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full bg-black">
      <body className="h-full overflow-hidden bg-black text-white antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
