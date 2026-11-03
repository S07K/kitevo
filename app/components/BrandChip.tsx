import { BrandIcon } from "./BrandIcon";
import type { BrandIconId } from "@/lib/brand-icons";

/**
 * A company named inline in UI copy, with its official logo (from `thesvg` via BrandIcon —
 * never hand-drawn brand art, per CLAUDE.md). Dark marks swap to the text colour in dark mode
 * (DARK_ON_DARK in lib/brand-icons.ts).
 */
const NAMES = {
  razorpay: "Razorpay",
  stripe: "Stripe",
  paypal: "PayPal",
  googledrive: "Google Drive",
  dropbox: "Dropbox",
  notion: "Notion",
  instagram: "Instagram",
  youtube: "YouTube",
} as const satisfies Partial<Record<BrandIconId, string>>;

export type BrandId = keyof typeof NAMES;

export function BrandChip({ brand, size = 13 }: { brand: BrandId; size?: number }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap font-medium text-foreground">
      <BrandIcon brand={brand} size={size} className="relative top-[2px]" />
      {NAMES[brand]}
    </span>
  );
}
