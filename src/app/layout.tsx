import type { Metadata, Viewport } from "next";
import { Fraunces, JetBrains_Mono, Manrope } from "next/font/google";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { cn } from "@/lib/utils";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "600"],
});

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
    <html
      lang="en"
      className={cn(
        manrope.variable,
        fraunces.variable,
        jetbrainsMono.variable,
      )}
    >
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
      </body>
    </html>
  );
}
