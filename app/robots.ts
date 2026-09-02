import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/app-url";

const BASE = APP_URL.replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth-gated and machine routes have no SEO value.
      disallow: ["/api/", "/dashboard", "/onboarding"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
