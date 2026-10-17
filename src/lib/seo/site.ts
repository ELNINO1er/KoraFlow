import type { Metadata } from "next";
import { BRAND_DOMAIN, BRAND_NAME } from "@/lib/constants/brand";

export const SITE_URL = `https://${BRAND_DOMAIN}`;
export const PUBLIC_ROBOTS = { index: true, follow: true } as const;
export const PRIVATE_ROBOTS = { index: false, follow: false, noarchive: true } as const;

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title: { absolute: title.includes(BRAND_NAME) ? title : `${title} | ${BRAND_NAME}` }, description,
    alternates: { canonical: path },
    robots: PUBLIC_ROBOTS,
    openGraph: { title, description, url: path, type: "website", locale: "fr_CI", siteName: BRAND_NAME },
    twitter: { card: "summary_large_image", title, description },
  };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
