import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduCore School Management",
  description: "Premium full-stack school management system"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
