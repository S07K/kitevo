import { Landmark } from "lucide-react";
import { BrandIcon } from "./BrandIcon";
import { BRAND_ICONS } from "@/lib/brand-icons";

/**
 * Payout-method marks.
 *
 * Brand logos come from `thesvg` via <BrandIcon> (lib/brand-icons.ts) — add a vendor
 * there, never by pasting SVG paths. Generic icons come from lucide-react. Each mark sits on a tile so it reads correctly in light and dark mode.
 */

type Props = { size?: number; className?: string };

// Wise's brand pairs its bright green with forest green for the glyph.
const WISE_FOREST = "#163300";
const WISE_GREEN = `#${BRAND_ICONS.wise.hex}`;

function Tile({ size, bg, className = "", children }: { size: number; bg?: string; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${className}`}
      style={{ width: size, height: size, background: bg }}
    >
      {children}
    </span>
  );
}

export function PayPalMark({ size = 40, className = "" }: Props) {
  return (
    <Tile size={size} bg="#ffffff" className={`ring-1 ring-black/5 ${className}`}>
      <BrandIcon brand="paypal" size={size * 0.55} label="PayPal" lightOnly />
    </Tile>
  );
}

export function WiseMark({ size = 40, className = "" }: Props) {
  return (
    <Tile size={size} bg={WISE_GREEN} className={className}>
      <span style={{ color: WISE_FOREST }} className="inline-flex">
        <BrandIcon brand="wise" mono size={size * 0.5} label="Wise" />
      </span>
    </Tile>
  );
}

export function BankMark({ size = 40, className = "" }: Props) {
  return (
    <Tile size={size} className={`bg-foreground text-background ${className}`}>
      <Landmark size={size * 0.5} strokeWidth={1.8} aria-label="Bank transfer" />
    </Tile>
  );
}

export function PayoutMark({ method, size }: { method: string; size?: number }) {
  if (method === "paypal") return <PayPalMark size={size} />;
  if (method === "wise") return <WiseMark size={size} />;
  return <BankMark size={size} />;
}
