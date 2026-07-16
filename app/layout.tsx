import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Providers } from "./components/Providers";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const BASE_URL = APP_URL.replace(/\/$/, "");

export const metadata: Metadata = {
  title: {
    default: "Kitevo — Professional Media Kits for Creators",
    template: "%s — Kitevo",
  },
  description:
    "Turn your link-in-bio into a high-end agency portfolio. Live Instagram & YouTube stats, audience demographics, and growth charts that win brand deals.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    siteName: "Kitevo",
    type: "website",
    url: BASE_URL,
    title: "Kitevo — Professional Media Kits for Creators",
    description:
      "Live stats, audience demographics, and growth charts. One link that closes brand deals.",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Kitevo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kitevo — Professional Media Kits for Creators",
    description: "Live stats, audience demographics, and growth charts. One link that closes brand deals.",
    images: ["/og-default.png"],
  },
};

import type { Viewport } from 'next'
import { APP_URL } from "@/lib/app-url";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // <-- This is the magic key
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${cormorant.variable} ${dmSans.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
