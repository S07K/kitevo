import type { ReactNode } from "react";
import { BrandIcon } from "@/app/components/BrandIcon";
import { LogoMark } from "@/app/components/Logo";
import type { Comparison } from "@/lib/comparisons";

/**
 * Brand marks + simple flat SVG illustrations for the compare pages.
 * Marks: Kitevo's own mark; `thesvg` where a brand exists there (Linktree, Canva); otherwise the
 * company's official favicon, downloaded from its site into public/brands/. Never hand-drawn
 * brand art. Illustrations are generic shapes coloured with theme tokens (light + dark).
 */

/** A brand's mark at a given size. */
export function BrandMark({ who, size = 28 }: { who: "kitevo" | Comparison["mark"]; size?: number }) {
  const box = { width: size, height: size };
  if (who === "kitevo") {
    return (
      <span className="inline-flex shrink-0 items-center justify-center rounded-[28%] bg-[#1b365d] dark:bg-white" style={box}>
        <span className="dark:hidden"><LogoMark size={Math.round(size * 0.62)} on="ink" /></span>
        <span className="hidden dark:inline"><LogoMark size={Math.round(size * 0.62)} on="cream" /></span>
      </span>
    );
  }
  if (who.kind === "icon") {
    return (
      <span className="inline-flex shrink-0 items-center justify-center rounded-[28%] border border-border bg-white" style={box}>
        <BrandIcon brand={who.brand} size={Math.round(size * 0.62)} lightOnly />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny local brand icon
    <img src={who.src} alt="" width={size} height={size} className="shrink-0 rounded-[28%] object-contain" style={box} />
  );
}

/** "[K] Kitevo  vs  [logo] Stan Store" */
export function VsLockup({ c, size = 36 }: { c: Comparison; size?: number }) {
  const short = c.name.replace(/^a /, "");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <BrandMark who="kitevo" size={size} /> Kitevo
      </span>
      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">vs</span>
      <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <BrandMark who={c.mark} size={size} /> {short}
      </span>
    </div>
  );
}

/* ─── Flat SVG illustrations (viewBox 0 0 240 240, theme tokens) ─────────── */

const C = {
  panel: "var(--background)",
  line: "var(--border)",
  ink: "var(--foreground)",
  primary: "var(--primary)",
  soft: "var(--primary-soft)",
  accent: "var(--accent)",
  muted: "var(--muted)",
};

function Frame({ children }: { children: ReactNode }) {
  return (
    <>
      <rect x="1" y="1" width="238" height="238" rx="28" fill={C.panel} stroke={C.line} strokeWidth="2" />
      {children}
    </>
  );
}

/** Kitevo: a profile card with stats and a rising chart. */
function KitevoSvg() {
  return (
    <Frame>
      <circle cx="54" cy="56" r="20" fill={C.soft} />
      <circle cx="54" cy="51" r="7" fill={C.primary} />
      <path d="M42 68c3-7 8-9 12-9s9 2 12 9" fill={C.primary} />
      <rect x="84" y="44" width="90" height="10" rx="5" fill={C.ink} opacity="0.85" />
      <rect x="84" y="60" width="56" height="8" rx="4" fill={C.muted} />
      <circle cx="186" cy="49" r="7" fill={C.primary} />
      <path d="M183 49l2.2 2.2 4-4.4" stroke="var(--primary-foreground)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="30" y="92" width="84" height="46" rx="12" fill={C.muted} />
      <rect x="126" y="92" width="84" height="46" rx="12" fill={C.muted} />
      <rect x="42" y="104" width="44" height="10" rx="5" fill={C.ink} opacity="0.8" />
      <rect x="42" y="120" width="30" height="6" rx="3" fill={C.line} />
      <rect x="138" y="104" width="34" height="10" rx="5" fill={C.ink} opacity="0.8" />
      <rect x="138" y="120" width="40" height="6" rx="3" fill={C.line} />
      <path d="M30 188 L66 172 L96 178 L132 158 L168 162 L210 140 L210 194 L30 194 Z" fill={C.soft} />
      <path d="M30 188 L66 172 L96 178 L132 158 L168 162 L210 140" stroke={C.primary} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="210" cy="140" r="5" fill={C.primary} />
      <rect x="30" y="204" width="180" height="20" rx="10" fill={C.primary} />
    </Frame>
  );
}

/** Storefront: an awning over product tiles with price tags. */
function StorefrontSvg() {
  // Striped awning (7 stripes of 28px across x 22–218) with a rounded scallop under each.
  const stripes = Array.from({ length: 7 }, (_, i) => 22 + i * 28);
  return (
    <Frame>
      <clipPath id="awning">
        <rect x="22" y="22" width="196" height="34" rx="8" />
      </clipPath>
      <g clipPath="url(#awning)">
        {stripes.map((x, i) => (
          <rect key={x} x={x} y="22" width="28" height="34" fill={i % 2 ? C.soft : C.primary} />
        ))}
      </g>
      {stripes.map((x, i) => (
        <path key={x} d={`M${x} 55 a14 12 0 0 0 28 0 Z`} fill={i % 2 ? C.soft : C.primary} />
      ))}
      {[0, 1].map((r) =>
        [0, 1].map((c) => {
          const x = 30 + c * 94, y = 86 + r * 72;
          return (
            <g key={`${r}${c}`}>
              <rect x={x} y={y} width="86" height="62" rx="12" fill={C.muted} />
              <rect x={x + 12} y={y + 10} width="62" height="26" rx="6" fill={C.line} />
              <rect x={x + 12} y={y + 44} width="30" height="8" rx="4" fill={C.ink} opacity="0.75" />
              <rect x={x + 52} y={y + 41} width="24" height="14" rx="7" fill={C.primary} />
            </g>
          );
        }),
      )}
    </Frame>
  );
}

/** Link-in-bio: avatar over a stack of link rows. */
function LinksSvg() {
  return (
    <Frame>
      <circle cx="120" cy="54" r="22" fill={C.soft} />
      <circle cx="120" cy="49" r="8" fill={C.primary} />
      <path d="M107 66c3-8 9-10 13-10s10 2 13 10" fill={C.primary} />
      <rect x="84" y="86" width="72" height="8" rx="4" fill={C.ink} opacity="0.7" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="34" y={110 + i * 30} width="172" height="22" rx="11" fill={C.panel} stroke={C.line} strokeWidth="2" />
          <circle cx="50" cy={121 + i * 30} r="4" fill={C.primary} />
          <rect x="62" y={117 + i * 30} width={[100, 78, 90, 66][i]} height="8" rx="4" fill={C.line} />
        </g>
      ))}
    </Frame>
  );
}

/** All-in-one: links, a product, a mini chart, an email. */
function AllInOneSvg() {
  return (
    <Frame>
      {[0, 1].map((i) => (
        <rect key={i} x="30" y={26 + i * 28} width="180" height="20" rx="10" fill={C.panel} stroke={C.line} strokeWidth="2" />
      ))}
      <rect x="30" y="88" width="86" height="80" rx="12" fill={C.muted} />
      <rect x="42" y="100" width="62" height="40" rx="6" fill={C.line} />
      <rect x="42" y="148" width="40" height="8" rx="4" fill={C.ink} opacity="0.7" />
      <rect x="124" y="88" width="86" height="80" rx="12" fill={C.muted} />
      {[18, 30, 22, 40].map((h, i) => (
        <rect key={i} x={138 + i * 16} y={154 - h} width="10" height={h} rx="3" fill={C.primary} opacity={i === 3 ? 1 : 0.35} />
      ))}
      <rect x="30" y="180" width="180" height="40" rx="12" fill={C.soft} />
      <rect x="44" y="190" width="30" height="20" rx="3" fill={C.panel} stroke={C.primary} strokeWidth="2" />
      <path d="M44 192 L59 202 L74 192" stroke={C.primary} strokeWidth="2" fill="none" />
      <rect x="86" y="196" width="96" height="8" rx="4" fill={C.primary} opacity="0.6" />
    </Frame>
  );
}

/** Static file: a document with typed-in lines and a pencil. */
function StaticSvg() {
  return (
    <Frame>
      <path d="M58 26 H152 L184 58 V214 H58 Z" fill={C.panel} stroke={C.line} strokeWidth="2" strokeLinejoin="round" />
      <path d="M152 26 V58 H184" fill={C.muted} stroke={C.line} strokeWidth="2" strokeLinejoin="round" />
      <rect x="74" y="48" width="58" height="10" rx="5" fill={C.ink} opacity="0.75" />
      <rect x="74" y="74" width="94" height="44" rx="8" fill={C.muted} />
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x={74 + i * 50} y="130" width="44" height="30" rx="6" fill="none" stroke={C.line} strokeWidth="2" strokeDasharray="4 3" />
          <rect x={82 + i * 50} y="142" width="26" height="7" rx="3.5" fill={C.line} />
        </g>
      ))}
      <rect x="74" y="174" width="94" height="7" rx="3.5" fill={C.line} />
      <rect x="74" y="188" width="70" height="7" rx="3.5" fill={C.line} />
      <g transform="rotate(-38 182 168)">
        <rect x="176" y="120" width="14" height="70" rx="3" fill={C.accent} />
        <path d="M176 190 L183 204 L190 190 Z" fill={C.ink} opacity="0.8" />
        <rect x="176" y="120" width="14" height="10" rx="3" fill={C.primary} />
      </g>
    </Frame>
  );
}

const OTHER = { storefront: StorefrontSvg, links: LinksSvg, allinone: AllInOneSvg, static: StaticSvg } as const;

/** Hero illustration: Kitevo's idea vs the other product's idea, as two simple drawings. */
export function CompareHeroArt({ c }: { c: Comparison }) {
  const short = c.name.replace(/^a /, "");
  const Other = OTHER[c.art];
  return (
    <figure aria-label={`Illustration: a Kitevo media kit next to ${short}`} className="w-full">
      <div className="relative grid grid-cols-2 gap-5 sm:gap-8">
        {[
          { label: "Kitevo", mark: "kitevo" as const, Art: KitevoSvg },
          { label: short, mark: c.mark, Art: Other },
        ].map(({ label, mark, Art }) => (
          <div key={label} className="min-w-0">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BrandMark who={mark} size={18} /> {label}
            </p>
            <svg viewBox="0 0 240 240" className="h-auto w-full" role="presentation">
              <Art />
            </svg>
          </div>
        ))}
        <span
          className="absolute left-1/2 top-[55%] flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground shadow-lg ring-4 ring-canvas sm:h-12 sm:w-12"
          aria-hidden
        >
          vs
        </span>
      </div>
    </figure>
  );
}
