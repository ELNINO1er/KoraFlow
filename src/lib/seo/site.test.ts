import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { jsonLd, PRIVATE_ROBOTS, publicPageMetadata } from "./site";
import { SOLUTIONS } from "./solutions";

describe("public search visibility", () => {
  it("includes only the landing page and real public solutions in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toHaveLength(5);
    expect(new Set(urls).size).toBe(5);
    expect(urls.every((url) => url === "https://alymero.com/" || SOLUTIONS.some((entry) => url === `https://alymero.com/solutions/${entry.slug}`))).toBe(true);
    expect(urls.some((url) => /\/(?:admin|portail|q|i|c)(?:\/|$)/.test(url))).toBe(false);
  });
  it("does not block the assets Google needs to render the site", () => {
    expect(robots()).toMatchObject({ rules: { allow: "/", disallow: "/api/" }, sitemap: "https://alymero.com/sitemap.xml" });
  });
  it("indexes public pages explicitly and keeps private pages noindex by default", () => {
    expect(PRIVATE_ROBOTS.index).toBe(false);
    const metadata = publicPageMetadata("CRM PME", "Description", "/solutions/crm-pme");
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.alternates?.canonical).toBe("/solutions/crm-pme");
    expect(metadata.title).toEqual({ absolute: "CRM PME | Alymero" });
  });
  it("escapes script-breaking content in structured data", () => {
    const unsafe = { name: "</script><script>alert(1)</script>" };
    expect(jsonLd(unsafe)).not.toContain("<");
    expect(JSON.parse(jsonLd(unsafe))).toEqual(unsafe);
  });
});
