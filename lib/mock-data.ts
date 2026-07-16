/**
 * Mock / demo data for creators and media kit content.
 * Used until real auth and DB: creator profile, links, work samples, rates, brands.
 * Stats come from lib/platforms.
 */

export const MOCK_CREATOR = {
  name: "Alex Chen",
  username: "alexchen",
  bio: "Lifestyle & fashion creator • LA based • Brand partnerships",
  avatar: "/avatar-placeholder.svg",
  email: "alex@example.com",
};

export const MOCK_LINKS = [
  { label: "Latest Collab", url: "https://example.com/collab" },
  { label: "Press Kit", url: "https://example.com/press" },
  { label: "Contact", url: "mailto:alex@example.com" },
];

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

/** Rates block: optional "from $X" or "Contact for rates". */
export interface KitRates {
  show: boolean;
  /** If set, show "Rates from $X". Otherwise "Contact for rates". */
  fromAmount?: number;
  ctaLabel?: string;
}

export const MOCK_RATES: KitRates = {
  show: true,
  fromAmount: 2500,
  ctaLabel: "Get in touch",
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
