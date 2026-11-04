import { prisma } from "@/lib/prisma";
import { isGoogleShortLink, parseSchedulerUrl, type ParsedScheduler, type Scheduler } from "@/lib/scheduler-links";

/**
 * Resolve a Google Calendar short link (calendar.app.google/<code>) to its full appointments
 * URL by following redirects, without loading the page. Only Google hosts are followed.
 */
export async function resolveGoogleShortLink(raw: string): Promise<string | null> {
  let url = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
  for (let hop = 0; hop < 5; hop++) {
    const host = new URL(url).hostname.toLowerCase();
    if (host !== "calendar.app.google" && !host.endsWith(".google.com") && host !== "google.com") return null;
    if (parseSchedulerUrl(url)?.provider === "google") return url;
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "Mozilla/5.0 (Kitevo link check)" } });
    const next = res.headers.get("location");
    if (!next || res.status < 300 || res.status >= 400) return null;
    url = new URL(next, url).toString();
  }
  return null;
}

/** Parse a link a creator pasted, resolving Google short links first. */
export async function parseSchedulerInput(raw: unknown): Promise<ParsedScheduler | null> {
  if (isGoogleShortLink(raw)) {
    const full = await resolveGoogleShortLink(raw as string).catch(() => null);
    return full ? parseSchedulerUrl(full) : null;
  }
  return parseSchedulerUrl(raw);
}

export async function schedulerConnectionsFor(userId: string) {
  return prisma.schedulerConnection.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
}

export async function hasScheduler(userId: string, provider: Scheduler) {
  return (await prisma.schedulerConnection.count({ where: { userId, provider } })) > 0;
}
