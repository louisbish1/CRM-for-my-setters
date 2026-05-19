import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Tracker",
  description: "Minimal internal setter lead tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CRM Tracker",
  },
  icons: {
    apple: "/logo.png",
    icon: "/logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
