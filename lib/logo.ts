/**
 * The Kitevo mark: a bold K printed three times, each impression offset like a
 * misregistered risograph.
 *
 * The offset layers are not a drop shadow — they read as earlier impressions with the
 * current one landing on top, which is the "evo" in the name (a media kit that keeps
 * updating, versus a PDF frozen at export). Riso print also puts the mark in the same
 * world as the Cormorant wordmark: indie zine, not enterprise dashboard.
 *
 * Framework-free on purpose: `app/components/Logo.tsx` and
 * `scripts/generate-social-graphics.ts` (plain node) both consume it, so the mark can
 * never drift between the app and the social assets.
 */

/** Bold K, cap height 68 (y 16..84), stem 18 wide, foot reaching past the arm tip. */
export const LOGO_K_PATH =
  "M18 16 L36 16 L36 40 L58 16 L80 16 L50 50 L84 84 L64 84 L36 58 L36 84 L18 84 Z";

export const LOGO_VIEWBOX = "0 0 100 100";

/**
 * Back-to-front impressions. Each is the same path, nudged up-left.
 * Even spacing (9 → 4.5 → 0) keeps the trail reading as print misregistration rather
 * than as an accident.
 */
export const LOGO_LAYER_OFFSETS = [-9, -4.5, 0] as const;

/**
 * The three impressions overshoot the letter's own box up-left, so the composite's real
 * centre is (46.5, 45.5). Without this nudge the mark sits visibly high-left inside any
 * avatar circle.
 */
export const LOGO_RECENTRE = { x: 3.5, y: 4.5 } as const;

/** Back, middle, top. Top is the "current" impression and carries legibility. */
export interface LogoColors {
  back: string;
  middle: string;
  top: string;
}

/** On ink (the default surface: avatars, OG, dark nav). */
export const LOGO_ON_INK: LogoColors = {
  back: "#6366f1",
  middle: "#c97b4b",
  top: "#f5f3f0",
};

/** On cream / light surfaces — only the top impression flips. */
export const LOGO_ON_CREAM: LogoColors = {
  back: "#6366f1",
  middle: "#c97b4b",
  top: "#111110",
};

/**
 * Top impression inherits the surrounding text colour. The nav sits on cream in light mode
 * and ink in dark, so this tracks the theme with no hook and no flash. The two ghost
 * impressions stay put — they read on both surfaces.
 */
export const LOGO_ON_AUTO: LogoColors = {
  back: "#6366f1",
  middle: "#c97b4b",
  top: "currentColor",
};

/** Single-impression fallback for embroidery, favicons at 16px, one-colour print. */
export function logoMonoSvg(color: string, size?: number): string {
  const dim = size ? ` width="${size}" height="${size}"` : "";
  return `<svg viewBox="${LOGO_VIEWBOX}"${dim} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kitevo"><path fill="${color}" d="${LOGO_K_PATH}"/></svg>`;
}

/** The full three-impression mark as a standalone SVG string (for node / static files). */
export function logoMarkSvg(colors: LogoColors = LOGO_ON_INK, size?: number): string {
  const dim = size ? ` width="${size}" height="${size}"` : "";
  return `<svg viewBox="${LOGO_VIEWBOX}"${dim} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kitevo">${logoLayers(colors)}</svg>`;
}

/** Just the <g> of impressions — for inlining into a larger SVG or an HTML page. */
export function logoLayers(colors: LogoColors = LOGO_ON_INK): string {
  const fills = [colors.back, colors.middle, colors.top];
  const paths = LOGO_LAYER_OFFSETS.map(
    (o, i) =>
      `<path transform="translate(${o},${o})" fill="${fills[i]}" d="${LOGO_K_PATH}"/>`
  ).join("");
  return `<g transform="translate(${LOGO_RECENTRE.x},${LOGO_RECENTRE.y})">${paths}</g>`;
}
