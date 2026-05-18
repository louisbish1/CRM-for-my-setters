import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Setter Leads",
  description: "Minimal internal setter lead tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Louisbish CRM",
  },
  icons: {
    apple: "/icon.png",
    icon: "/icon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
