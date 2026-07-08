import type { Metadata, Viewport } from "next";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { isMockModeActive } from "@/lib/domain/availability-provider";

import "./globals.css";

// Note: fonts are provided via CSS system-font stacks (see tailwind.config.ts /
// globals.css). We intentionally do NOT use next/font/google so the production
// build never needs to fetch Google Fonts at build time.

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cekdomain.ink";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "CekDomain.ink - Check Domain Availability Instantly",
  description:
    "Check whether your domain name is available, get smart domain suggestions, and continue registration easily with CekDomain.ink.",
  applicationName: "CekDomain.ink",
  keywords: [
    "domain checker",
    "domain availability",
    "cek domain",
    "domain suggestions",
    "register domain",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "CekDomain.ink",
    description: "Find and register your perfect domain name instantly.",
    type: "website",
    url: siteUrl,
    siteName: "CekDomain.ink",
  },
  twitter: {
    card: "summary_large_image",
    title: "CekDomain.ink",
    description: "Find and register your perfect domain name instantly.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper font-sans text-ink-900 antialiased">
        <div className="bg-decor" aria-hidden="true">
          <div className="orb orb-a" />
          <div className="orb orb-b" />
          <div className="orb orb-c" />
          <div className="grain" />
        </div>
        <Header />
        {children}
        <Footer />
        {isMockModeActive() && (
          <div className="fixed bottom-3 left-3 z-[60] rounded-full bg-warn px-3.5 py-1.5 text-[0.72rem] font-bold uppercase tracking-wide text-white shadow-md">
            Mock mode: fake results
          </div>
        )}
      </body>
    </html>
  );
}
