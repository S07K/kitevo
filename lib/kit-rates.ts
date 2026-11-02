import type { KitRates, RateItem } from "@/lib/mock-data";

/**
 * Rate card rules, shared by the kit API (sanitising writes), the editor and the public kit.
 * Stored as JSON in Kit.rates, so no migration: older rows ({ show, fromAmount, ctaLabel })
 * still parse — items just start empty.
 */

export const MAX_RATE_ITEMS = 8;
export const MAX_RATE_LABEL = 60;
export const MAX_RATE_PRICE = 1_000_000;

export const EMPTY_RATES: KitRates = { show: false, items: [] };

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const price = (v: unknown): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.min(Math.round(n), MAX_RATE_PRICE);
};

/** Coerce anything (API body, stored JSON) into a valid KitRates. Never throws. */
export function normalizeRates(raw: unknown): KitRates {
  if (!raw || typeof raw !== "object") return { ...EMPTY_RATES, items: [] };
  const r = raw as Record<string, unknown>;
  const items: RateItem[] = (Array.isArray(r.items) ? r.items : [])
    .map((it, i): RateItem | null => {
      if (!it || typeof it !== "object") return null;
      const o = it as Record<string, unknown>;
      const label = clean(o.label, MAX_RATE_LABEL);
      const p = price(o.price);
      // Keep half-filled rows while the creator is typing; the kit hides incomplete ones.
      if (!label && p === undefined) return null;
      return { id: clean(o.id, 24) || `r${i}`, label, price: p };
    })
    .filter((x): x is RateItem => x !== null)
    .slice(0, MAX_RATE_ITEMS);
  const fromAmount = price(r.fromAmount);
  const ctaLabel = clean(r.ctaLabel, 40);
  return {
    show: r.show === true,
    items,
    ...(fromAmount !== undefined ? { fromAmount } : {}),
    ...(ctaLabel ? { ctaLabel } : {}),
  };
}

/** Rows complete enough to show on the public kit. */
export function publicRateItems(rates: KitRates): Array<RateItem & { price: number }> {
  return (rates.items ?? []).filter((i): i is RateItem & { price: number } => !!i.label && typeof i.price === "number");
}

/** True when the kit would actually render a rate card. */
export function hasPublicRates(rates: KitRates | null | undefined): boolean {
  if (!rates?.show) return false;
  return publicRateItems(rates).length > 0 || typeof rates.fromAmount === "number";
}

export const formatUsd = (n: number) => `$${n.toLocaleString("en-US")}`;
