/**
 * Brand marks from `thesvg` (official brand SVGs, pinned exact in package.json). Import each
 * icon by its own subpath so only these end up in the bundle. Add a brand here, then use
 * <BrandIcon brand="…" />. Never hand-draw brand art. Brands thesvg doesn't have (Stan Store,
 * Beacons) use their official favicon from public/brands/.
 */
import instagram from "thesvg/instagram";
import youtube from "thesvg/youtube";
import razorpay from "thesvg/razorpay";
import stripe from "thesvg/stripe";
import paypal from "thesvg/paypal";
import googleDrive from "thesvg/google-drive";
import dropbox from "thesvg/dropbox";
import notion from "thesvg/notion";
import linktree from "thesvg/linktree";
import canva from "thesvg/canva";
import wise from "thesvg/wise";
import calendly from "thesvg/calendly";
import calcom from "thesvg/cal-com";
import googleCalendar from "thesvg/google-calendar";
import groq from "thesvg/groq";
import openrouter from "thesvg/openrouter";
import openai from "thesvg/openai";
import gemini from "thesvg/gemini";
import anthropic from "thesvg/anthropic";

type Icon = { title: string; hex: string; svg: string; variants: Record<string, string> };

const RAW_ICONS = {
  instagram,
  youtube,
  razorpay,
  stripe,
  paypal,
  googledrive: googleDrive,
  dropbox,
  notion,
  linktree,
  canva,
  wise,
  calendly,
  calcom,
  googlecalendar: googleCalendar,
  groq,
  openrouter,
  openai,
  gemini,
  anthropic,
} satisfies Record<string, Icon>;

/**
 * Prefix every SVG id (and its url(#…) / href="#…" references) with the brand, because these
 * marks are injected inline into one document: Gemini and Instagram both use ids a–h, so on a
 * page showing both, Gemini's gradients resolved to Instagram's. Scoped, no two brands can collide.
 */
function scopeIds(svg: string, scope: string): string {
  return svg
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${scope}-${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${scope}-${id})`)
    .replace(/((?:xlink:)?href)="#([^"]+)"/g, (_, attr, id) => `${attr}="#${scope}-${id}"`);
}

function scoped<T extends Record<string, Icon>>(icons: T): T {
  return Object.fromEntries(
    Object.entries(icons).map(([name, icon]) => [
      name,
      { ...icon, svg: scopeIds(icon.svg, `bi-${name}`), variants: Object.fromEntries(Object.entries(icon.variants).map(([k, v]) => [k, scopeIds(v, `bi-${name}-${k}`)])) },
    ]),
  ) as T;
}

export const BRAND_ICONS = scoped(RAW_ICONS);

export type BrandIconId = keyof typeof BRAND_ICONS;

/**
 * Full-colour marks too dark to read on the navy dark theme: in dark mode they render the
 * single-colour ("mono") variant in the text colour instead.
 */
export const DARK_ON_DARK: ReadonlySet<BrandIconId> = new Set(["razorpay", "paypal"]);

/**
 * Brands whose full-colour "default" is a wordmark, unreadable at icon size: render their
 * glyph (the mono variant) in the brand colour instead.
 */
export const GLYPH_IN_BRAND_COLOUR: ReadonlySet<BrandIconId> = new Set(["stripe", "calendly"]);

/**
 * Brands whose only thesvg mark is a wordmark (unreadable at icon size): use the company's
 * official favicon, downloaded from its own site into public/brands/ (CLAUDE.md icon rule).
 */
/**
 * Single-colour marks whose full-colour default is white (made for dark tiles): render the
 * glyph (mono, else the fill-less light variant) in the current text colour, so it reads in
 * both themes.
 */
export const MONO_IN_TEXT_COLOUR: ReadonlySet<BrandIconId> = new Set(["openai", "anthropic"]);

// OpenRouter rebranded to an "OR" mark; thesvg still ships the old arrows (checked 2026-11-09).
export const FAVICON_ICONS: Partial<Record<BrandIconId, string>> = { calcom: "/brands/calcom.png", openrouter: "/brands/openrouter.png" };
