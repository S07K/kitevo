import {
  LOGO_K_PATH,
  LOGO_LAYER_OFFSETS,
  LOGO_ON_AUTO,
  LOGO_ON_CREAM,
  LOGO_ON_INK,
  LOGO_RECENTRE,
  LOGO_VIEWBOX,
  type LogoColors,
} from "@/lib/logo";

const SURFACES = { ink: LOGO_ON_INK, cream: LOGO_ON_CREAM, auto: LOGO_ON_AUTO } as const;

interface LogoMarkProps {
  /** Rendered px. The overprint trail needs room; below ~20px use `mono`. */
  size?: number;
  /** Surface the mark sits on. `auto` inherits text colour, which tracks the theme. */
  on?: keyof typeof SURFACES;
  /** Collapse to a single impression — for tiny sizes or one-colour contexts. */
  mono?: boolean;
  /** Overrides `on`/`mono` colouring entirely. */
  colors?: LogoColors;
  className?: string;
  /** Set when the mark stands alone; leave off when a "Kitevo" wordmark sits beside it. */
  title?: string;
}

/**
 * The Kitevo K. See `lib/logo.ts` for why it's overprinted.
 *
 * Decorative by default: in the nav the adjacent "Kitevo" wordmark is the accessible
 * name, so a title here would just make screen readers say it twice.
 */
export function LogoMark({
  size = 28,
  on = "ink",
  mono = false,
  colors,
  className,
  title,
}: LogoMarkProps) {
  const c = colors ?? SURFACES[on];
  const fills = mono ? [c.top, c.top, c.top] : [c.back, c.middle, c.top];

  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      width={size}
      height={size}
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <g transform={`translate(${LOGO_RECENTRE.x},${LOGO_RECENTRE.y})`}>
        {/* A single impression when mono: the offsets would just fatten the letter. */}
        {(mono ? [0] : LOGO_LAYER_OFFSETS).map((o, i) => (
          <path key={o} transform={`translate(${o},${o})`} fill={fills[i]} d={LOGO_K_PATH} />
        ))}
      </g>
    </svg>
  );
}
