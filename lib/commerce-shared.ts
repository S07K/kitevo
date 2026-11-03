import { normalizeLinkUrl } from "@/lib/profile-links";

/**
 * Client-safe commerce helpers (limits, validation, the public product shape). Server-only
 * parts (database, tokens) live in lib/commerce.ts, which re-exports these.
 */

export const MAX_PRODUCTS = 12;
export const MAX_TITLE = 80;
export const MAX_DESCRIPTION = 1000;
export const MAX_NOTE = 300;
export const MAX_COVER_CHARS = 200_000;

export type ProductInput = {
  title: string;
  description: string;
  coverUrl: string | null;
  deliveryUrl: string | null;
  deliveryNote: string;
  status: "draft" | "published";
};

export type ProductProblem = { field: keyof ProductInput; error: string };

/** Clean a product from the editor. Returns the cleaned input or the first problem. */
export function normalizeProductInput(raw: unknown): { ok: true; value: ProductInput } | { ok: false; problem: ProductProblem } {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const title = str(o.title, MAX_TITLE);
  const status = o.status === "published" ? "published" : "draft";
  const deliveryRaw = typeof o.deliveryUrl === "string" ? o.deliveryUrl.trim() : "";
  // Delivery must be a web page (a file link), never mailto: or a script URL.
  const deliveryUrl = deliveryRaw ? normalizeLinkUrl(deliveryRaw) : null;
  if (deliveryRaw && (!deliveryUrl || deliveryUrl.startsWith("mailto:"))) {
    return { ok: false, problem: { field: "deliveryUrl", error: "Use a web link to the file, like a Google Drive or Dropbox share link." } };
  }
  const cover = typeof o.coverUrl === "string" && o.coverUrl.startsWith("data:image/") ? o.coverUrl : null;
  if (cover && cover.length > MAX_COVER_CHARS) {
    return { ok: false, problem: { field: "coverUrl", error: "That image is too large. Choose a smaller one." } };
  }
  if (status === "published") {
    if (!title) return { ok: false, problem: { field: "title", error: "Give it a name before publishing." } };
    if (!deliveryUrl) return { ok: false, problem: { field: "deliveryUrl", error: "Add the link people get after they sign up." } };
  }
  return {
    ok: true,
    value: { title, description: str(o.description, MAX_DESCRIPTION), coverUrl: cover, deliveryUrl, deliveryNote: str(o.deliveryNote, MAX_NOTE), status },
  };
}

export function cleanEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

/** What a kit or product page shows (never the delivery link). */
export function publicProduct(p: { id: string; title: string; description: string; coverUrl: string | null; priceCents: number; currency: string; type: string }) {
  return { id: p.id, title: p.title, description: p.description, coverUrl: p.coverUrl, priceCents: p.priceCents, currency: p.currency, type: p.type };
}
export type PublicProduct = ReturnType<typeof publicProduct>;
