/**
 * Payout-method marks. PayPal and Wise glyphs are the official brand icons from
 * simple-icons (CC0, v16.36.0), shown nominatively to identify the payout method.
 * Each sits on its brand tile so it reads correctly in both light and dark mode.
 */

type Props = { size?: number; className?: string };

/** PayPal: brand blue glyph on white. */
export function PayPalMark({ size = 40, className = "" }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-black/5 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} role="img" aria-label="PayPal">
        <path
          fill="#002991"
          d="M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513-.648-.478-2.105-.86-3.722-.86m6.57 5.546c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 0 1 2.848 4.686M9.653 5.546h6.408c.907 0 1.942.222 2.363.541-.195 2.741-2.655 5.483-6.441 5.483H8.714Z"
        />
      </svg>
    </span>
  );
}

/** Wise: forest-green glyph on Wise bright green. */
export function WiseMark({ size = 40, className = "" }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl ${className}`}
      style={{ width: size, height: size, background: "#9FE870" }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} role="img" aria-label="Wise">
        <path fill="#163300" d="M6.488 7.469 0 15.05h11.585l1.301-3.576H7.922l3.033-3.507.01-.092L8.993 4.48h8.873l-6.878 18.925h4.706L24 .595H2.543l3.945 6.874Z" />
      </svg>
    </span>
  );
}

/** Bank transfer: neutral building mark (no brand). */
export function BankMark({ size = 40, className = "" }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-foreground text-background ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.5}
        height={size * 0.5}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label="Bank transfer"
      >
        <path d="M3 9.5 12 4l9 5.5" />
        <path d="M4.5 10v8M9.5 10v8M14.5 10v8M19.5 10v8" />
        <path d="M3 20.5h18" />
      </svg>
    </span>
  );
}

export function PayoutMark({ method, size }: { method: string; size?: number }) {
  if (method === "paypal") return <PayPalMark size={size} />;
  if (method === "wise") return <WiseMark size={size} />;
  return <BankMark size={size} />;
}
