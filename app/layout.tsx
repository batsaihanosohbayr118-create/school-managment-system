import type { Metadata, Viewport } from "next";
import "./globals.css";
import NoConnectionBanner from "@/components/NoConnection";

export const metadata: Metadata = {
  title: "Nova Mind Academy",
  description: "School management system for Nova Mind Academy",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: "Nova Mind",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#2563eb"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <NoConnectionBanner />
      </body>
    </html>
  );
}