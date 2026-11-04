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

type Icon = { title: string; hex: string; svg: string; variants: Record<string, string> };

export const BRAND_ICONS = {
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
} satisfies Record<string, Icon>;

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
export const GLYPH_IN_BRAND_COLOUR: ReadonlySet<BrandIconId> = new Set(["stripe"]);
