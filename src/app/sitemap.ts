import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";
import { SOLUTIONS } from "@/lib/seo/solutions";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/` }, ...SOLUTIONS.map((page) => ({ url: `${SITE_URL}/solutions/${page.slug}` }))];
}
