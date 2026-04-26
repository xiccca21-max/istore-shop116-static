import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./promo-pages.css";
import { CartProvider } from "@/components/cart/CartProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "iStore Набережные Челны",
  description: "Магазин техники Apple и аксессуаров в Набережных Челнах.",
  icons: {
    icon: [{ url: "/assets/header-logo.png", type: "image/png" }],
    shortcut: [{ url: "/assets/header-logo.png", type: "image/png" }],
    apple: [{ url: "/assets/header-logo.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
