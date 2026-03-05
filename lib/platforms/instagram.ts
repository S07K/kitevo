/**
 * Instagram platform adapter.
 * Currently returns mock data. Replace with Meta Graph API / Instagram Basic Display
 * when app is approved. See: https://developers.facebook.com/docs/instagram-api
 */

import type { PlatformId } from "./types";
import type { PlatformMeta, PlatformStatsWithCharts } from "./types";

const META: PlatformMeta = {
  id: "instagram",
  displayName: "Instagram",
  iconKey: "instagram",
};

/** Mock growth data for demo. Replace with real time-series from API. */
const MOCK_GROWTH = [
  { month: "Aug", followers: 38000 },
  { month: "Sep", followers: 41000 },
  { month: "Oct", followers: 44000 },
  { month: "Nov", followers: 47000 },
  { month: "Dec", followers: 49000 },
  { month: "Jan", followers: 52000 },
];

/** Mock audience demographics. Replace with real breakdown from API. */
const MOCK_AUDIENCE = [
  { age: "18-24", pct: 34 },
  { age: "25-34", pct: 42 },
  { age: "35-44", pct: 16 },
  { age: "45+", pct: 8 },
];

export function getInstagramMeta(): PlatformMeta {
  return META;
}

/**
 * Fetch Instagram stats for a creator.
 * @param _handle - Instagram handle (unused while mock; use for API call later)
 * @returns Stats + optional growth chart and demographics
 */
export async function getInstagramStats(_handle?: string): Promise<PlatformStatsWithCharts> {
  // TODO: Replace with Meta Graph API when approved.
  // Example: GET /{ig-user-id}/insights?metric=followers_count,engagement
  return {
    followers: 52_000,
    avgEngagement: 4.2,
    growthThisMonth: 12.3,
    extra: { following: 892, posts: 342 },
    growthDataPoints: MOCK_GROWTH,
    audienceDemographics: MOCK_AUDIENCE,
  };
}

/** A post fetched from Instagram (or other platform) for "select from profile" flow. */
export interface FetchedPost {
  id: string;
  platform: "instagram" | "tiktok" | "youtube";
  thumbnailUrl: string;
  caption: string | null;
  permalink?: string;
  mediaType?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
}

/** Mock recent posts. Replace with Meta Graph API: GET /{ig-user-id}/media?fields=id,media_type,media_url,permalink,caption */
const MOCK_RECENT_POSTS: FetchedPost[] = [
  {
    id: "ig_mock_1",
    platform: "instagram",
    thumbnailUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop",
    caption: "Spring collection launch 🎀 @fashionco",
    permalink: "https://instagram.com/p/mock1",
    mediaType: "VIDEO",
  },
  {
    id: "ig_mock_2",
    platform: "instagram",
    thumbnailUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop",
    caption: "Unboxing the new drop 📦 @beautybrand",
    permalink: "https://instagram.com/p/mock2",
    mediaType: "CAROUSEL_ALBUM",
  },
  {
    id: "ig_mock_3",
    platform: "instagram",
    thumbnailUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=400&fit=crop",
    caption: "Travel diary ✈️ @travelco",
    permalink: "https://instagram.com/p/mock3",
    mediaType: "VIDEO",
  },
  {
    id: "ig_mock_4",
    platform: "instagram",
    thumbnailUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    caption: "Morning routine with the new skincare line",
    permalink: "https://instagram.com/p/mock4",
    mediaType: "IMAGE",
  },
];

/**
 * Fetch recent posts from Instagram for the creator to pick as work samples.
 * When Meta Graph API is connected: use /{ig-user-id}/media with user's token.
 */
export async function getInstagramRecentPosts(_handle?: string): Promise<FetchedPost[]> {
  // TODO: Replace with real API: GET /{ig-user-id}/media?fields=id,media_type,media_url,permalink,caption
  await new Promise((r) => setTimeout(r, 400));
  return [...MOCK_RECENT_POSTS];
}
