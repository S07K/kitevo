/**
 * Mock / demo data for creators and media kit content.
 * Used until real auth and DB: creator profile, links, work samples, rates, brands.
 * Stats come from lib/platforms.
 */

export const MOCK_CREATOR = {
  name: "Alex Chen",
  username: "alexchen",
  bio: "Lifestyle & fashion creator • LA based • Brand partnerships",
  // WebP, not PNG: the same 800x800 illustration is 49 KB as WebP and 660 KB as PNG.
  // Cropped to head-and-shoulders because this is only ever shown as a circle, and the
  // full-body source was unreadable at avatar size.
  avatar: "/demo/avatar.webp",
  email: "alex@example.com",
};

/**
 * Empty on purpose. These previously pointed at example.com and rendered a "Get in touch"
 * block of dead buttons on the demo kit, which is the first thing a prospective creator
 * sees. The links section hides itself when the array is empty. Links remain a real
 * feature for actual kits; there is just nothing honest to put here.
 */
/** Demo kit contact link (example.com is reserved for examples, so it reaches no one). */
export const MOCK_LINKS: { label: string; url: string }[] = [{ label: "Email Alex", url: "mailto:alex@example.com" }];

/** Work sample: example post or video for the "proof of work" section. */
export interface WorkSample {
  id: string;
  thumbnailUrl?: string;
  platform: "instagram" | "tiktok" | "youtube";
  title?: string;
  /** Legacy free-text caption — superseded by structured metrics */
  caption?: string;
  /** e.g. "Fashion Co" */
  campaignFor?: string;
  /** e.g. "Reel", "Carousel", "Video", "Story" */
  contentType?: string;
  /** Total views / video plays */
  views?: number;
  likes?: number;
  comments?: number;
  /** Instagram saves */
  saves?: number;
  /** Total reach (unique accounts) */
  reach?: number;
  sourceMediaId?: string;
}

export const MOCK_WORK_SAMPLES: WorkSample[] = [
  {
    id: "1",
    platform: "instagram",
    title: "Spring collection launch",
    campaignFor: "Fashion Co",
    contentType: "Reel",
    views: 2100000,
    likes: 84000,
    comments: 1200,
    saves: 9400,
  },
  {
    id: "2",
    platform: "instagram",
    title: "Unboxing series",
    campaignFor: "Beauty Brand",
    contentType: "Carousel",
    reach: 890000,
    likes: 41000,
    comments: 680,
    saves: 5200,
  },
  {
    id: "3",
    platform: "instagram",
    title: "Travel diary",
    campaignFor: "Travel Co",
    contentType: "Reel",
    views: 1400000,
    likes: 62000,
    comments: 940,
    saves: 7800,
  },
];

/** One line on the rate card, e.g. "Instagram Reel" — $450. Price in whole USD. */
export interface RateItem {
  id: string;
  label: string;
  price?: number;
}

/** Rate card. Rules + sanitising live in lib/kit-rates.ts. */
export interface KitRates {
  show: boolean;
  /** Itemised deliverables. */
  items?: RateItem[];
  /** Optional "Rates from $X" line, shown when there are no complete items. */
  fromAmount?: number;
  /** Button label; the button goes to the kit's contact form or links. */
  ctaLabel?: string;
}

/** Demo kit only (/kit/demo). Real kits start from EMPTY_RATES. */
export const MOCK_RATES: KitRates = {
  show: true,
  items: [
    { id: "d1", label: "Instagram Reel", price: 450 },
    { id: "d2", label: "Story set (3)", price: 220 },
    { id: "d3", label: "UGC video (usage 3 months)", price: 600 },
  ],
  ctaLabel: "Work with me",
};

/**
 * Shape of the logo's frame on the kit's brand board. Creators pick the one matching the
 * image they uploaded, so a wide wordmark isn't boxed into a square (and vice versa).
 */
export type BrandLogoRatio = "auto" | "wide" | "square" | "tall";

/** Past brand / case study for social proof. */
export interface BrandPartner {
  id: string;
  name: string;
  logoUrl?: string;
  /** Frame the logo is displayed in. Defaults to "auto" (a short, neutral strip). */
  logoRatio?: BrandLogoRatio;
  /** Short line e.g. "Campaign • Q1 2024" */
  tagline?: string;
}

/** `short` is for the editor's segmented control; `label` for longer-form UI. */
export const BRAND_LOGO_RATIO_OPTIONS: { value: BrandLogoRatio; label: string; short: string }[] = [
  { value: "auto", label: "Auto", short: "Auto" },
  { value: "wide", label: "Wide / wordmark", short: "Wide" },
  { value: "square", label: "Square", short: "Square" },
  { value: "tall", label: "Tall", short: "Tall" },
];

/** Frame classes for the brand board, keyed by the creator's chosen ratio. */
export const BRAND_LOGO_RATIO_CLASS: Record<BrandLogoRatio, string> = {
  auto: "h-12",
  wide: "aspect-[16/9]",
  square: "aspect-square max-h-28",
  tall: "aspect-[3/4] max-h-32",
};

export const MOCK_BRANDS: BrandPartner[] = [
  { id: "1", name: "Fashion Co", tagline: "Spring campaign • 2024" },
  { id: "2", name: "Beauty Brand", tagline: "Unboxing series" },
  { id: "3", name: "Travel Co", tagline: "Destination content" },
];

/**
 * Posts for the demo kit's grid. Shaped as `FetchedPost` (lib/platforms/instagram) so the
 * demo goes through exactly the same rendering path as a real connected account.
 *
 * Thumbnails are the generated riso compositions, not photographs: a real person's photo
 * in a demo is a licensing and privacy problem, and stock imagery reads as fake on a page
 * whose whole claim is that its numbers are real.
 */
export const MOCK_POSTS = [
  {
    id: "demo-1",
    platform: "instagram" as const,
    thumbnailUrl: "/demo/post-1.webp",
    caption: "Unboxing series, part three",
    mediaType: "CAROUSEL_ALBUM" as const,
    timestamp: "2026-06-28T10:00:00Z",
    likes: 41000,
    comments: 680,
    saves: 5200,
    reach: 890000,
  },
  {
    id: "demo-2",
    platform: "instagram" as const,
    thumbnailUrl: "/demo/post-2.webp",
    caption: "Spring collection launch with Fashion Co",
    mediaType: "VIDEO" as const,
    timestamp: "2026-06-21T10:00:00Z",
    likes: 84000,
    comments: 1200,
    saves: 9400,
    views: 2100000,
  },
  {
    id: "demo-3",
    platform: "instagram" as const,
    thumbnailUrl: "/demo/post-3.webp",
    caption: "Travel diary, Lisbon",
    mediaType: "VIDEO" as const,
    timestamp: "2026-06-14T10:00:00Z",
    likes: 62000,
    comments: 940,
    saves: 7800,
    views: 1400000,
  },
];
