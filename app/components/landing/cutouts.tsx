import type { CSSProperties, ReactNode } from "react";
import { SiInstagram, SiYoutube } from "@icons-pack/react-simple-icons";

/**
 * Building blocks for the landing page's "cutout" illustrations: miniature, non-interactive
 * renderings of real Kitevo surfaces (a kit, an inquiry, the pipeline). Every number in them
 * is illustrative and the surrounding UI says so with <ExampleTag> — the landing page never
 * presents invented people or results as real (see CLAUDE.md, honest social proof).
 */

export function ExampleTag({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
        tone === "dark" ? "bg-white/15 text-white/80" : "bg-muted text-muted-foreground"
      } ${className}`}
    >
      Example
    </span>
  );
}

/** A floating white card with the soft lift used by every cutout. */
export function Cutout({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      style={style}
      className={`rounded-2xl border border-black/5 bg-white text-[#1b365d] shadow-[0_18px_40px_-12px_rgba(27,54,93,0.35)] ${className}`}
    >
      {children}
    </div>
  );
}

/** Round "feature bubble" (aqua disc, icon, short label). */
export function Bubble({ icon, label, className = "", style }: { icon: ReactNode; label: string; className?: string; style?: CSSProperties }) {
  return (
    <div
      style={style}
      className={`flex aspect-square flex-col items-center justify-center gap-1.5 rounded-full bg-[#a0e0ef]/90 p-4 text-center text-[#1b365d] shadow-[0_12px_30px_-10px_rgba(27,54,93,0.45)] ring-8 ring-[#a0e0ef]/25 ${className}`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">{icon}</span>
      <span className="text-[11px] font-semibold leading-tight">{label}</span>
    </div>
  );
}

/** Phone chrome around a screen. Width drives everything; content scales with it. */
export function PhoneFrame({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      style={style}
      className={`relative rounded-[2.4rem] bg-[#0e1c30] p-2 shadow-[0_30px_60px_-20px_rgba(14,28,48,0.6)] ${className}`}
    >
      <div className="absolute left-1/2 top-3.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-[#0e1c30]" aria-hidden />
      <div className="relative overflow-hidden rounded-[1.9rem]">{children}</div>
    </div>
  );
}

export type KitLook = {
  name: string;
  handle: string;
  niche: string;
  initials: string;
  bg: string;
  fg: string;
  /** Avatar + buttons */
  accent: string;
  accentFg: string;
  followers: string;
  engagement: string;
  platform: "instagram" | "youtube";
  rates: Array<{ label: string; price: string }>;
};

/** A media kit as it renders on a phone: header, live stats, rate card, contact button. */
export function KitMock({ look, compact = false }: { look: KitLook; compact?: boolean }) {
  const PlatformIcon = look.platform === "instagram" ? SiInstagram : SiYoutube;
  return (
    <div className="flex flex-col px-4 pb-5 pt-9" style={{ backgroundColor: look.bg, color: look.fg }}>
      <div className="flex flex-col items-center text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full font-display text-xl font-semibold"
          style={{ backgroundColor: look.accent, color: look.accentFg }}
        >
          {look.initials}
        </span>
        <p className="mt-2 font-display text-xl font-semibold leading-tight">{look.name}</p>
        <p className="text-[10px] opacity-60">
          @{look.handle} · {look.niche}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-1.5">
        {[
          { v: look.followers, l: look.platform === "instagram" ? "Followers" : "Subscribers" },
          { v: look.engagement, l: look.platform === "instagram" ? "Engagement" : "Avg views" },
        ].map((s) => (
          <div key={s.l} className="rounded-xl px-2.5 py-2" style={{ backgroundColor: `${look.fg}10` }}>
            <p className="flex items-center gap-1 text-[9px] opacity-60">
              <PlatformIcon size={8} aria-hidden /> {s.l}
            </p>
            <p className="font-display text-lg font-semibold leading-none tabular-nums">{s.v}</p>
          </div>
        ))}
      </div>
      <p className="mt-1.5 flex items-center justify-center gap-1 text-[9px] opacity-60">
        <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" aria-hidden /> Live, synced from {look.platform === "instagram" ? "Instagram" : "YouTube"}
      </p>

      {!compact && (
        <div className="mt-3 rounded-xl px-3 py-2" style={{ backgroundColor: `${look.fg}10` }}>
          <p className="text-[9px] font-semibold opacity-60">Rates</p>
          {look.rates.map((r) => (
            <p key={r.label} className="mt-1 flex items-center justify-between text-[11px]">
              <span className="opacity-80">{r.label}</span>
              <span className="font-semibold tabular-nums">{r.price}</span>
            </p>
          ))}
        </div>
      )}

      <span
        className="mt-3 rounded-full py-2 text-center text-[11px] font-semibold"
        style={{ backgroundColor: look.accent, color: look.accentFg }}
      >
        Work with me
      </span>
    </div>
  );
}

/** Hand-drawn ellipse, stroked in sky, for the "0%" moment. */
export function Scribble({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 200" fill="none" className={className} aria-hidden>
      <path
        d="M150 14C86 6 26 38 16 92c-9 52 38 92 104 96 70 4 126-30 128-84 2-46-42-82-104-88-26-2-52 2-74 12"
        stroke="#60C1E5"
        strokeWidth="9"
        strokeLinecap="round"
      />
    </svg>
  );
}
