import { SiPaypal, SiPaypalHex, SiWise, SiWiseHex } from "@icons-pack/react-simple-icons";
import { Landmark } from "lucide-react";

/**
 * Payout-method marks.
 *
 * Brand logos come from @icons-pack/react-simple-icons (official simple-icons glyphs,
 * one `Si<Brand>` component + `Si<Brand>Hex` colour each) — add a new vendor by
 * importing its component, never by pasting SVG paths. Generic icons come from
 * lucide-react. Each mark sits on a tile so it reads correctly in light and dark mode.
 */

type Props = { size?: number; className?: string };

// Wise's brand pairs its bright green (SiWiseHex) with forest green for the glyph.
const WISE_FOREST = "#163300";

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
      <SiPaypal size={size * 0.55} color={SiPaypalHex} title="PayPal" />
    </Tile>
  );
}

export function WiseMark({ size = 40, className = "" }: Props) {
  return (
    <Tile size={size} bg={SiWiseHex} className={className}>
      <SiWise size={size * 0.5} color={WISE_FOREST} title="Wise" />
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
