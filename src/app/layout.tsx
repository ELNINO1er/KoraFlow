import type { Metadata } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";
import {
  BRAND_DESCRIPTION,
  BRAND_DOMAIN,
  BRAND_NAME,
  BRAND_TAGLINE,
} from "@/lib/constants/brand";
import { ToastProvider } from "@/components/ui/toast";
import { IdleSessionGuard } from "@/components/app/idle-session-guard";
import { PRIVATE_ROBOTS } from "@/lib/seo/site";
import "./globals.css";

const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const manrope = localFont({
  src: "../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(`https://${BRAND_DOMAIN}`),
  applicationName: BRAND_NAME,
  title: {
    default: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    template: `%s · ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  robots: PRIVATE_ROBOTS,
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
  openGraph: {
    type: "website",
    locale: "fr_CI",
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The existing per-request CSP nonce requires dynamic HTML, including public pages.
  await connection();
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ToastProvider><IdleSessionGuard />{children}</ToastProvider>
      </body>
    </html>
  );
}
