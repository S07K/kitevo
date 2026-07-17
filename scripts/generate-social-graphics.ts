/**
 * Renders Kitevo's social + share graphics to PNG with Chromium (via Playwright).
 *
 * Kept as code rather than exported images so the brand stays in one place: the fonts
 * (Cormorant Garamond / DM Sans), the palette, and the vibe accents are the same values the
 * app uses. Change them here and re-run.
 *
 *   npx tsx scripts/generate-social-graphics.ts
 *
 * The K itself lives in lib/logo.ts, shared with app/components/Logo.tsx so the mark can't
 * drift between the product and its social assets.
 *
 * Outputs:
 *   public/og-default.png                     1200x630  link previews (referenced by app/layout.tsx)
 *   brand/social/avatar.png                   1000x1000 profile picture (IG / X / LinkedIn)
 *   brand/social/x-header.png                 1500x500  X profile header
 *   brand/social/linkedin-banner.png          1128x191  LinkedIn company banner
 *   brand/social/instagram-post-launch.png    1080x1080 launch/announcement post
 *   app/icon.svg                                        favicon
 */

import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { LOGO_ON_CREAM, LOGO_ON_INK, logoLayers, logoMarkSvg } from "../lib/logo";

// ── Brand tokens (mirrors app/globals.css + lib/kit-appearance.ts) ──
const INK = "#111110";
const CREAM = "#f5f3f0";
const MUTED = "#8a8a86";
/** The five kit vibes, in the order the footer strip uses them. */
const VIBES = ["#f5f0e8", "#c9a84c", "#c97b4b", "#6366f1", "#2d2d2b"];

const FONTS = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
`;

const RESET = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: ${INK}; color: ${CREAM}; -webkit-font-smoothing: antialiased; }
  .display { font-family: "Cormorant Garamond", Georgia, serif; }
  h1 { text-wrap: balance; }
  .sans { font-family: "DM Sans", system-ui, sans-serif; }
  .stage { width: 100vw; height: 100vh; overflow: hidden; position: relative; display: flex; }
  /* The dotted texture used across the kit pages. */
  .dots {
    position: absolute; inset: 0;
    background-image: radial-gradient(${CREAM}14 1px, transparent 1px);
    background-size: 22px 22px;
  }
  .strip { position: absolute; left: 0; right: 0; height: 8px; display: flex; }
  .strip > i { flex: 1; }
  .mark { display: block; }
  .mark svg { width: 100%; height: auto; display: block; }
`;

const vibeStrip = (pos: "top" | "bottom") =>
  `<div class="strip" style="${pos}: 0">${VIBES.map((c) => `<i style="background:${c}"></i>`).join("")}</div>`;

/** The mark at a fixed pixel width. */
const mark = (px: number) =>
  `<span class="mark" style="width:${px}px">${logoMarkSvg(LOGO_ON_INK)}</span>`;

/** Mark + "Kitevo" wordmark, optically baselined. */
const lockup = (markPx: number, fontPx: number) => `
  <span style="display:inline-flex; align-items:center; gap:${Math.round(markPx * 0.42)}px;">
    ${mark(markPx)}
    <span class="display" style="font-size:${fontPx}px; font-weight:600; letter-spacing:.01em; line-height:1;">Kitevo</span>
  </span>`;

type Graphic = { file: string; width: number; height: number; body: string };

const GRAPHICS: Graphic[] = [
  // ── Link preview — this is referenced by app/layout.tsx and was missing entirely ──
  {
    file: "public/og-default.png",
    width: 1200,
    height: 630,
    body: `
      <div class="stage" style="flex-direction:column; justify-content:center; padding: 0 92px;">
        <div class="dots"></div>
        ${vibeStrip("top")}
        <p class="sans" style="font-size:19px; letter-spacing:.22em; text-transform:uppercase; color:${MUTED}; margin-bottom:26px;">
          For creators · Built to win brand deals
        </p>
        <h1 class="display" style="font-size:104px; line-height:1.02; font-weight:600; letter-spacing:-0.02em; max-width:16ch;">
          Your media kit should close deals
        </h1>
        <p class="sans" style="font-size:26px; line-height:1.5; color:${MUTED}; margin-top:30px; max-width:34ch;">
          Live Instagram and YouTube stats, audience insights, and growth. All on one link.
        </p>
        <div style="position:absolute; right:92px; bottom:48px;">${lockup(46, 40)}</div>
      </div>`,
  },

  // ── Profile picture — the mark alone, because a wordmark is unreadable at 40px ──
  {
    file: "brand/social/avatar.png",
    width: 1000,
    height: 1000,
    body: `
      <div class="stage" style="align-items:center; justify-content:center;">
        <div class="dots"></div>
        <div style="position:absolute; inset:0; background: radial-gradient(circle at 50% 42%, #1e1e1c 0%, ${INK} 70%);"></div>
        <!-- Mark only: profile pictures render as a ~40px circle, where a wordmark is
             unreadable mush and anything near the edge gets clipped by the round mask. -->
        <span class="mark" style="position:relative; width:62%;">${logoMarkSvg(LOGO_ON_INK)}</span>
      </div>`,
  },

  // ── X header — note the left ~180px sits under the avatar on profile pages ──
  {
    file: "brand/social/x-header.png",
    width: 1500,
    height: 500,
    body: `
      <div class="stage" style="align-items:center; padding-left:300px;">
        <div class="dots"></div>
        ${vibeStrip("bottom")}
        <div>
          <h1 class="display" style="font-size:76px; font-weight:600; line-height:1; letter-spacing:-0.02em;">
            Your media kit should close deals
          </h1>
          <p class="sans" style="font-size:23px; color:${MUTED}; margin-top:22px;">
            Live stats. Real audience data. One link. &nbsp;·&nbsp; @getkitevo
          </p>
        </div>
      </div>`,
  },

  // ── LinkedIn company banner — very short, so a single line reads best ──
  {
    file: "brand/social/linkedin-banner.png",
    width: 1128,
    height: 191,
    body: `
      <!-- padding-left clears the company logo LinkedIn overlays at the bottom-left. -->
      <div class="stage" style="align-items:center; padding-left:250px;">
        <div class="dots"></div>
        ${vibeStrip("bottom")}
        <div style="display:flex; align-items:center; gap:22px;">
          ${lockup(48, 44)}
          <span style="width:1px; height:34px; background:#2a2a28;"></span>
          <span class="sans" style="font-size:20px; color:${MUTED};">
            Media kits that close brand deals
          </span>
        </div>
      </div>`,
  },

  // ── Square post for launch/update announcements ──
  {
    file: "brand/social/instagram-post-launch.png",
    width: 1080,
    height: 1080,
    body: `
      <div class="stage" style="flex-direction:column; justify-content:center; padding:0 84px;">
        <div class="dots"></div>
        ${vibeStrip("top")}
        <p class="sans" style="font-size:18px; letter-spacing:.22em; text-transform:uppercase; color:${MUTED}; margin-bottom:28px;">
          Building in public
        </p>
        <h1 class="display" style="font-size:96px; line-height:1.04; font-weight:600; letter-spacing:-0.02em; max-width:13ch;">
          Stop sending brands a PDF
        </h1>
        <p class="sans" style="font-size:25px; line-height:1.55; color:${MUTED}; margin-top:30px; max-width:26ch;">
          Kitevo turns your Instagram and YouTube into a live media kit brands actually trust.
        </p>
        <div style="position:absolute; left:84px; bottom:72px;">${lockup(44, 38)}</div>
        <p class="sans" style="position:absolute; right:84px; bottom:84px; font-size:19px; color:${MUTED};">@getkitevo</p>
      </div>`,
  },
];

async function main() {
  const root = process.cwd();
  const browser = await chromium.launch();

  for (const g of GRAPHICS) {
    const page = await browser.newPage({
      viewport: { width: g.width, height: g.height },
      deviceScaleFactor: 2, // retina-crisp
    });
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${RESET}</style></head><body>${g.body}</body></html>`,
      { waitUntil: "networkidle" }
    );
    await page.evaluate(() => document.fonts.ready);

    const out = path.join(root, g.file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out });
    await page.close();

    const kb = (fs.statSync(out).size / 1024).toFixed(0);
    console.log(`✓ ${g.file.padEnd(38)} ${g.width}x${g.height}  (${kb} KB @2x)`);
  }

  // Email logo. lib/email.ts points an <img> at {APP_URL}/logo-email.png, because Gmail and
  // Outlook strip <svg> and Gmail blocks data: URIs. Transparent, ink top impression: the
  // email shell is cream (#f5f3f0) and the wordmark beside it is #111110.
  // 44px for a 22px slot, so it stays sharp on retina.
  const emailPage = await browser.newPage({ viewport: { width: 22, height: 22 }, deviceScaleFactor: 2 });
  await emailPage.setContent(
    `<!doctype html><style>*{margin:0;padding:0}html,body{width:22px;height:22px}svg{width:22px;height:22px;display:block}</style>${logoMarkSvg(LOGO_ON_CREAM)}`
  );
  const emailOut = path.join(root, "public/logo-email.png");
  await emailPage.screenshot({ path: emailOut, omitBackground: true });
  await emailPage.close();
  console.log(`✓ ${"public/logo-email.png".padEnd(38)} 22x22 @2x  (transparent, for lib/email.ts)`);

  // Favicon. Bakes in the ink plate rather than shipping a transparent mark: the top
  // impression is cream, which would vanish on a light browser tab.
  const icon =
    `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kitevo">` +
    `<rect width="100" height="100" rx="22" fill="${INK}"/>` +
    `<g transform="translate(50,50) scale(0.76) translate(-50,-50)">${logoLayers(LOGO_ON_INK)}</g>` +
    `</svg>`;
  fs.writeFileSync(path.join(root, "app/icon.svg"), icon);
  console.log(`✓ ${"app/icon.svg".padEnd(38)} favicon (Next serves this at /icon.svg)`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
