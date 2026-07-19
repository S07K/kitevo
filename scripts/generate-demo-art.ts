/**
 * Generates the demo kit's imagery: one avatar and three post thumbnails.
 *
 * Abstract riso-print compositions rather than photographs. Three reasons:
 * a photo of a real person in a demo is a licensing and privacy problem, stock photography
 * reads as fake on a page whose entire pitch is that its numbers are real, and this shares
 * the offset-impression language of the logo (lib/logo.ts) so the demo looks like Kitevo
 * rather than like a placeholder someone forgot to replace.
 *
 *   npx tsx scripts/generate-demo-art.ts
 *
 * Writes public/demo/*.svg. SVG on purpose: a few KB each, sharp at any size, and no
 * binary assets in the repo.
 */

import fs from "node:fs";
import path from "node:path";

// Same palette as the vibe strip in generate-social-graphics.ts.
const INK = "#111110";
const CREAM = "#f5f0e8";
const GOLD = "#c9a84c";
const TERRACOTTA = "#c97b4b";
const INDIGO = "#6366f1";

/**
 * The riso look: the same shape printed two or three times, each impression nudged and
 * semi-transparent so overlaps darken like real ink. Opacity rather than mix-blend-mode,
 * which is unreliable for SVG loaded through <img>.
 */
function impressions(shape: (fill: string, dx: number, dy: number) => string): string {
  return [
    shape(INDIGO, -11, -11),
    shape(TERRACOTTA, -5.5, -5.5),
    shape(CREAM, 0, 0),
  ].join("");
}

/** Paper texture: the dot grid used across the kit pages, as a reusable <pattern>. */
const DOTS = `
  <pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse">
    <circle cx="1.5" cy="1.5" r="1.1" fill="${CREAM}" opacity="0.10"/>
  </pattern>`;

/**
 * Abstract portrait: a head and shoulders reduced to two circles.
 *
 * Proportioned for a circular crop, which is the only way this is ever displayed. The head
 * sits slightly above centre and the shoulder circle's cap just meets its base, so the
 * crop reads as a deliberate portrait rather than a shape clipped by accident.
 */
function avatar(): string {
  const head = (fill: string, dx: number, dy: number) =>
    `<circle cx="${200 + dx}" cy="${158 + dy}" r="78" fill="${fill}" opacity="0.9"/>`;
  // Mostly below the frame; only the top cap shows, which is what reads as shoulders.
  const body = (fill: string, dx: number, dy: number) =>
    `<circle cx="${200 + dx}" cy="${442 + dy}" r="200" fill="${fill}" opacity="0.9"/>`;

  return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Abstract portrait">
  <defs>${DOTS}</defs>
  <rect width="400" height="400" fill="${INK}"/>
  <rect width="400" height="400" fill="url(#dots)"/>
  <g>${impressions(body)}</g>
  <g>${impressions(head)}</g>
</svg>`;
}

/** 9:16, matching the Reels-style cards the kit renders Instagram posts in. */
const W = 360;
const H = 640;

function frame(inner: string, bg = INK): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Abstract composition">
  <defs>${DOTS}</defs>
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>
  ${inner}
</svg>`;
}

/** Overlapping discs — the most direct read of the overprint idea. */
function postCircles(): string {
  const disc = (cx: number, cy: number, r: number, fill: string, o = 0.85) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${o}"/>`;
  return frame(`
    ${disc(150, 250, 118, INDIGO)}
    ${disc(216, 316, 118, TERRACOTTA)}
    ${disc(183, 283, 118, CREAM, 0.72)}
    ${disc(120, 470, 46, GOLD, 0.9)}
  `);
}

/**
 * Concentric rings. Replaced an earlier half-dome whose flat chord read as a shape
 * cut off by mistake rather than a composition.
 */
function postArcs(): string {
  const ring = (r: number, w: number, fill: string, dx: number, dy: number, o: number) =>
    `<circle cx="${180 + dx}" cy="${300 + dy}" r="${r}" fill="none" stroke="${fill}" stroke-width="${w}" opacity="${o}"/>`;
  return frame(`
    ${ring(122, 26, INDIGO, -9, -9, 0.85)}
    ${ring(122, 26, TERRACOTTA, -4.5, -4.5, 0.85)}
    ${ring(122, 26, CREAM, 0, 0, 0.8)}
    ${ring(64, 18, GOLD, 0, 0, 0.9)}
    <circle cx="180" cy="300" r="20" fill="${CREAM}" opacity="0.85"/>
    <rect x="52" y="516" width="256" height="9" fill="${GOLD}" opacity="0.85"/>
    <rect x="52" y="540" width="150" height="9" fill="${CREAM}" opacity="0.4"/>
  `);
}

/** Diagonal bands on cream — one light card so the row is not uniformly dark. */
function postBands(): string {
  const band = (y: number, fill: string, o: number) =>
    `<rect x="-60" y="${y}" width="480" height="58" fill="${fill}" opacity="${o}" transform="rotate(-24 180 320)"/>`;
  return frame(
    `
    ${band(180, INDIGO, 0.8)}
    ${band(250, TERRACOTTA, 0.8)}
    ${band(320, GOLD, 0.85)}
    ${band(390, INK, 0.85)}
    <circle cx="264" cy="150" r="52" fill="${INK}" opacity="0.9"/>
  `,
    CREAM
  );
}

const FILES: Record<string, string> = {
  "avatar.svg": avatar(),
  "post-1.svg": postCircles(),
  "post-2.svg": postArcs(),
  "post-3.svg": postBands(),
};

const outDir = path.join(process.cwd(), "public/demo");
fs.mkdirSync(outDir, { recursive: true });
for (const [name, svg] of Object.entries(FILES)) {
  const file = path.join(outDir, name);
  fs.writeFileSync(file, svg.trim() + "\n");
  console.log(`✓ public/demo/${name.padEnd(12)} ${(fs.statSync(file).size / 1024).toFixed(1)} KB`);
}
