/**
 * Scheduling connectors (bookings, integrations-first): creators book calls through their own
 * Calendly, Cal.com or Google Calendar appointment schedule, which owns availability, calendar
 * conflicts, reminders and (optionally) payment. Kitevo stores the link and embeds the page.
 * Client-safe. Every embed URL is rebuilt from parsed parts, never passed through raw.
 */

export const SCHEDULERS = ["calendly", "calcom", "google"] as const;
export type Scheduler = (typeof SCHEDULERS)[number];

export const SCHEDULER_INFO: Record<Scheduler, { name: string; icon: "calendly" | "calcom" | "googlecalendar"; example: string; where: string }> = {
  calendly: { name: "Calendly", icon: "calendly", example: "calendly.com/yourname/30min", where: "Calendly → Scheduling → an event type → Copy link (or your profile link)." },
  calcom: { name: "Cal.com", icon: "calcom", example: "cal.com/yourname/30min", where: "Cal.com → Event types → Copy link (or your public page cal.com/yourname)." },
  google: {
    name: "Google Calendar",
    icon: "googlecalendar",
    example: "calendar.app.google/… or calendar.google.com/calendar/appointments/schedules/…",
    where: "Google Calendar → your appointment schedule → Share → Copy link.",
  },
};

export type ParsedScheduler = { provider: Scheduler; url: string; embedUrl: string };

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

/**
 * Recognise a scheduling link. Returns the canonical public URL and the URL to embed, or null.
 * Google short links (calendar.app.google/…) can't be embedded: the server resolves them to
 * the full appointments URL first (see resolveGoogleShortLink).
 */
export function parseSchedulerUrl(raw: unknown): ParsedScheduler | null {
  if (typeof raw !== "string") return null;
  let s = raw.trim();
  if (!s || s.length > 500) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "calendly.com") {
    if (parts.length < 1 || parts.length > 2 || !parts.every((p) => SLUG.test(p))) return null;
    const url = `https://calendly.com/${parts.join("/")}`;
    return { provider: "calendly", url, embedUrl: `${url}?embed_type=Inline&hide_gdpr_banner=1&hide_landing_page_details=1` };
  }
  if (host === "cal.com" || host === "app.cal.com" || host === "i.cal.com") {
    if (parts.length < 1 || parts.length > 3 || !parts.every((p) => SLUG.test(p))) return null;
    if (["embed", "api", "auth", "settings", "event-types", "bookings"].includes(parts[0])) return null;
    const url = `https://cal.com/${parts.join("/")}`;
    return { provider: "calcom", url, embedUrl: url };
  }
  if (host === "calendar.google.com") {
    // /calendar/appointments/schedules/<id>  (also /calendar/u/0/appointments/schedules/<id>)
    const i = parts.indexOf("schedules");
    const id = i > 0 && parts[i - 1] === "appointments" ? parts[i + 1] : null;
    if (!id || !/^[A-Za-z0-9_-]{10,200}$/.test(id)) return null;
    const url = `https://calendar.google.com/calendar/appointments/schedules/${id}`;
    return { provider: "google", url, embedUrl: `${url}?gv=true` };
  }
  return null;
}

/** A Google short link (calendar.app.google/<code>) that must be resolved server-side. */
export function isGoogleShortLink(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const s = /^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
  try {
    const u = new URL(s);
    return u.hostname.toLowerCase() === "calendar.app.google" && /^\/[A-Za-z0-9]{6,64}\/?$/.test(u.pathname);
  } catch {
    return false;
  }
}

/** A product's booking link must use a connected scheduler (same provider). */
export function sameScheduler(a: string, provider: Scheduler): boolean {
  return parseSchedulerUrl(a)?.provider === provider;
}
