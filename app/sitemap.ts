import type { MetadataRoute } from "next";
import { getAllPostSlugs } from "@/lib/blog";
import { APP_URL } from "@/lib/app-url";
import { COMPARISONS } from "@/lib/comparisons";

const BASE = APP_URL.replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/pricing", "/referral-program", "/tools", "/tools/rate-calculator", "/tools/engagement-rate-calculator", "/compare", "/integrations", ...COMPARISONS.map((c) => `/compare/${c.slug}`), "/blog", "/privacy", "/terms"].map((p) => ({
    url: `${BASE}${p}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.7,
  }));

  const posts = getAllPostSlugs().map((slug) => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...posts];
}
