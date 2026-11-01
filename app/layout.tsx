import type { Metadata } from "next";
import Script from "next/script";
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
  /*
    Google Search Console ownership proof. Required before Google's OAuth branding
    verification will accept getkitevo.com as our homepage. The token is public (it ships
    in the HTML), so it lives in an env var only to avoid a code change per environment.
    Set GOOGLE_SITE_VERIFICATION in Vercel, redeploy, then verify in Search Console.
  */
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
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
import { ReferralCapture } from "@/app/components/ReferralCapture";

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
  // Google Analytics (GA4). Only loads when NEXT_PUBLIC_GA_ID is set, so set it in
  // production only — that keeps local dev and preview deploys out of the analytics data.
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${cormorant.variable} ${dmSans.variable} font-sans antialiased`}
      >
        <Providers>{children}</Providers>
        <Analytics />
        <ReferralCapture />
        <Script
          src="https://troopy.ai/api/support/widget.js"
          data-bot-id="6ae2fb0cee6ad29d94ccdc6b"
          strategy="afterInteractive"
        />
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga-gtag" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
