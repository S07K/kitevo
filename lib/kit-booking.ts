/**
 * A kit's "Book a call" button (client-safe). The creator picks a scheduling page from a
 * scheduler connected in Connectors (Calendly, Cal.com, Google appointment schedule); the kit
 * shows a button that opens it in a dialog. Stored per kit as JSON { url, label }.
 */
import { SCHEDULER_INFO, parseSchedulerUrl, type Scheduler } from "@/lib/scheduler-links";

export const MAX_BOOKING_LABEL = 40;
export const DEFAULT_BOOKING_LABEL = "Book a call";

export type KitBooking = { url: string | null; label: string };
export const EMPTY_BOOKING: KitBooking = { url: null, label: "" };

/** Clean a stored or submitted booking. Unknown links become null (no button). */
export function normalizeKitBooking(raw: unknown): KitBooking {
  let o: unknown = raw;
  if (typeof raw === "string") {
    try {
      o = JSON.parse(raw);
    } catch {
      o = {};
    }
  }
  const r = (o && typeof o === "object" ? o : {}) as Record<string, unknown>;
  const parsed = typeof r.url === "string" && r.url.trim() ? parseSchedulerUrl(r.url) : null;
  const label = typeof r.label === "string" ? r.label.trim().replace(/\s+/g, " ").slice(0, MAX_BOOKING_LABEL) : "";
  return { url: parsed?.url ?? null, label };
}

export type PublicBooking = { label: string; url: string; embedUrl: string; provider: Scheduler; providerName: string };

/**
 * What the public kit renders: only a valid link on a scheduler the creator still has
 * connected (disconnecting hides the button). The embed URL is rebuilt from parsed parts.
 */
export function publicBooking(booking: KitBooking, connected: string[]): PublicBooking | null {
  const parsed = booking.url ? parseSchedulerUrl(booking.url) : null;
  if (!parsed || !connected.includes(parsed.provider)) return null;
  return {
    label: booking.label || DEFAULT_BOOKING_LABEL,
    url: parsed.url,
    embedUrl: parsed.embedUrl,
    provider: parsed.provider,
    providerName: SCHEDULER_INFO[parsed.provider].name,
  };
}
