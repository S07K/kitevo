import type { CSSProperties, ReactNode } from "react";
import { SiInstagram, SiYoutube } from "@icons-pack/react-simple-icons";
import { AvatarImg } from "@/app/components/AvatarImg";

/** Small, face-cropped Unsplash portrait (hotlinked from their CDN, as their licence allows). */
export const unsplashPortrait = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?w=160&h=160&fit=crop&crop=faces&auto=format&q=70`;

/**
 * Building blocks for the landing page's "cutout" illustrations: miniature, non-interactive
 * renderings of real Kitevo surfaces (a kit, an inquiry, the pipeline). Every number in them
 * is illustrative, and each section's copy says so where it matters — the landing page never
 * presents invented people or results as real (see CLAUDE.md, honest social proof).
 */


/**
 * Cutouts are illustrations of the light app UI, so they stay white in dark mode. They pin
 * the light values of the tokens their children use so nothing inside
 * flips to dark-mode colours.
 */
const LIGHT_TOKENS = {
  "--muted": "#edf3f8",
  "--muted-foreground": "#556b84",
  "--border": "#dce6ef",
  "--foreground": "#1b365d",
  "--background": "#ffffff",
} as CSSProperties;

/** A floating white card with the soft lift used by every cutout. */
export function Cutout({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      style={{ ...LIGHT_TOKENS, ...style }}
      className={`rounded-2xl border border-black/5 bg-white text-[#1b365d] shadow-[0_18px_40px_-12px_rgba(27,54,93,0.35)] ${className}`}
    >
      {children}
    </div>
  );
}


export type KitLook = {
  name: string;
  handle: string;
  niche: string;
  initials: string;
  /** Portrait URL; initials show if it is missing or fails to load. */
  photo?: string;
  bg: string;
  fg: string;
  /** Avatar + button */
  accent: string;
  accentFg: string;
  followers: string;
  /** Second stat: engagement rate (Instagram) or average views (YouTube). */
  second: string;
  platform: "instagram" | "youtube";
  rates: Array<{ label: string; price: string }>;
};

/**
 * A media kit as a flat card (no device frame): header, two live stats, rates, contact
 * button. Fixed internal proportions so labels never wrap or clip; the parent sets width
 * (min 280px recommended).
 */
export function KitCard({
  look,
  className = "",
  style,
  showNiche = true,
}: {
  look: KitLook;
  className?: string;
  style?: CSSProperties;
  /** Off when the surrounding UI already names the niche. */
  showNiche?: boolean;
}) {
  const PlatformIcon = look.platform === "instagram" ? SiInstagram : SiYoutube;
  const platform = look.platform === "instagram" ? "Instagram" : "YouTube";
  const stats = [
    { label: look.platform === "instagram" ? "Followers" : "Subscribers", value: look.followers },
    { label: look.platform === "instagram" ? "Engagement" : "Avg. views", value: look.second },
  ];
  return (
    <div
      style={{ backgroundColor: look.bg, color: look.fg, ...style }}
      className={`rounded-[26px] p-5 shadow-[0_24px_50px_-18px_rgba(14,28,48,0.55)] dark:ring-1 dark:ring-white/10 ${className}`}
    >
      <div className="flex items-center gap-3">
        <AvatarImg
          src={look.photo}
          alt=""
          className="h-12 w-12 shrink-0 rounded-full object-cover"
          fallback={
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-display text-lg font-semibold"
              style={{ backgroundColor: look.accent, color: look.accentFg }}
            >
              {look.initials}
            </span>
          }
        />
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-semibold leading-tight">{look.name}</p>
          <p className="truncate text-xs opacity-65">@{look.handle}</p>
        </div>
        {showNiche && (
          <span className="ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: `${look.fg}14` }}>
            {look.niche}
          </span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0 rounded-2xl px-3 py-2.5" style={{ backgroundColor: `${look.fg}0f` }}>
            <p className="flex items-center gap-1.5 whitespace-nowrap text-[11px] opacity-65">
              <PlatformIcon size={10} aria-hidden /> {s.label}
            </p>
            <p className="mt-0.5 font-display text-2xl font-semibold leading-none tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] opacity-65">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#22c55e]" aria-hidden /> Live, synced from {platform}
      </p>

      <div className="mt-3 rounded-2xl px-3.5 py-2.5" style={{ backgroundColor: `${look.fg}0f` }}>
        <p className="text-[11px] font-semibold opacity-65">Rates</p>
        {look.rates.map((r) => (
          <p key={r.label} className="mt-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate opacity-85">{r.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">{r.price}</span>
          </p>
        ))}
      </div>

      <span
        className="mt-4 block rounded-full py-2.5 text-center text-sm font-semibold"
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
