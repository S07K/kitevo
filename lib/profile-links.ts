/**
 * Contact links shown on public kits. Rendered as <a href>, so the URL scheme is checked:
 * only web and email links survive. A `javascript:` link here would run in a brand's
 * browser when they click it on a creator's kit.
 */

export const MAX_LINKS = 8;
export const MAX_LINK_LABEL = 40;
export const MAX_LOCATION = 60;

export type ProfileLink = { label: string; url: string };

/** "instagram.com/me" → "https://instagram.com/me", "me@x.com" → "mailto:me@x.com". Null if unsafe or junk. */
export function normalizeLinkUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s || s.length > 500) return null;
  if (/^[^\s@/:]+@[^\s@/:]+\.[^\s@/:]+$/.test(s)) return `mailto:${s}`;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol === "mailto:") return u.pathname.includes("@") ? u.href : null;
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.href;
  } catch {
    return null;
  }
}

/** Clean a links array from the client: valid URLs only, trimmed labels, capped count. */
export function normalizeLinks(raw: unknown): ProfileLink[] {
  if (!Array.isArray(raw)) return [];
  const out: ProfileLink[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const { label, url } = x as { label?: unknown; url?: unknown };
    if (typeof url !== "string") continue;
    const clean = normalizeLinkUrl(url);
    if (!clean) continue;
    const l = typeof label === "string" && label.trim() ? label.trim().slice(0, MAX_LINK_LABEL) : defaultLabel(clean);
    out.push({ label: l, url: clean });
    if (out.length >= MAX_LINKS) break;
  }
  return out;
}

function defaultLabel(url: string): string {
  if (url.startsWith("mailto:")) return "Email";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}
