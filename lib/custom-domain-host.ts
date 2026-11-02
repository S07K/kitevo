/**
 * Host rules for custom domains. Dependency-free so middleware (no database) can use it.
 *
 * A request whose Host isn't one of Kitevo's own is treated as a creator's custom domain:
 * "/" renders that domain's kit, the kit's own API calls and assets pass through, and every
 * other path redirects to the same path on Kitevo (so "Create yours", /signup?ref=… etc.
 * keep working).
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Kitevo's own hosts: the app URL (+ www/apex twin), localhost, Vercel preview URLs, APP_HOSTS. */
export function isAppHost(host: string | null | undefined): boolean {
  if (!host) return true; // no Host header: never treat as a custom domain
  const h = host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  if (h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".localhost")) return true;
  if (h.endsWith(".vercel.app")) return true;
  const app = hostOf(APP_URL);
  if (app && (h === app || h === `www.${app}` || `www.${h}` === app)) return true;
  const extra = (process.env.APP_HOSTS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return extra.includes(h);
}

export function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

/** Where a path on a custom domain goes. */
export function customDomainRoute(pathname: string): "kit" | "passthrough" | "redirect" {
  if (pathname === "/" || pathname === "") return "kit";
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) return "passthrough";
  // Static files (favicon, images, fonts, robots.txt): serve them as-is.
  if (/\.[a-z0-9]{2,5}$/i.test(pathname)) return "passthrough";
  return "redirect";
}

/** Internal route that renders a custom domain's kit. Reserved as a username. */
export const CUSTOM_DOMAIN_ROUTE = "/custom-domain";

export const APP_ORIGIN = APP_URL.replace(/\/$/, "");
