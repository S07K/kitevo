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
  /** Placeholder: use neutral gradient or image URL when available. */
  thumbnailUrl?: string;
  platform: "instagram" | "tiktok" | "youtube";
  title?: string;
  caption?: string;
  /** e.g. "Campaign for Brand X" */
  campaignFor?: string;
  /** When sample was picked from fetched posts: platform media id for dedupe/refresh. */
  sourceMediaId?: string;
}

export const MOCK_WORK_SAMPLES: WorkSample[] = [
  {
    id: "1",
    platform: "instagram",
    title: "Spring collection launch",
    campaignFor: "Fashion Co",
    caption: "Reel • 2.1M views",
  },
  {
    id: "2",
    platform: "instagram",
    title: "Unboxing series",
    campaignFor: "Beauty Brand",
    caption: "Carousel • 890K reach",
  },
  {
    id: "3",
    platform: "instagram",
    title: "Travel diary",
    campaignFor: "Travel Co",
    caption: "Reel • 1.4M views",
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

/** Past brand / case study for social proof. */
export interface BrandPartner {
  id: string;
  name: string;
  logoUrl?: string;
  /** Short line e.g. "Campaign • Q1 2024" */
  tagline?: string;
}

export const MOCK_BRANDS: BrandPartner[] = [
  { id: "1", name: "Fashion Co", tagline: "Spring campaign • 2024" },
  { id: "2", name: "Beauty Brand", tagline: "Unboxing series" },
  { id: "3", name: "Travel Co", tagline: "Destination content" },
];
