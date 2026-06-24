/**
 * Platform registry: which platforms are enabled and how to fetch their stats.
 *
 * Adding a new platform (e.g. TikTok, YouTube):
 * 1. Create lib/platforms/tiktok.ts (or youtube.ts) with getTikTokMeta() and getTikTokStats(handle).
 * 2. Add "tiktok" to ENABLED_PLATFORMS below.
 * 3. Add tiktok: { getMeta, getStats } to PLATFORM_ADAPTERS.
 * 4. Update PlatformId in types.ts if not already included.
 */

import type { PlatformId, PlatformMeta, PlatformStats, PlatformStatsWithCharts } from "./types";
import { getInstagramMeta, getInstagramStats } from "./instagram";

/** Platforms we show on the media kit and dashboard. Instagram only for now. */
export const ENABLED_PLATFORMS: PlatformId[] = ["instagram"];

/** Adapter per platform. Add getTikTokStats, getYouTubeStats when integrating. */
const PLATFORM_ADAPTERS: Record<
  PlatformId,
  { getMeta: () => PlatformMeta; getStats: (handle?: string) => Promise<PlatformStats | PlatformStatsWithCharts> }
> = {
  instagram: {
    getMeta: getInstagramMeta,
    getStats: getInstagramStats,
  },
  // Placeholder for future integrations — uncomment and implement when ready:
  // tiktok: { getMeta: getTikTokMeta, getStats: getTikTokStats },
  // youtube: { getMeta: getYouTubeMeta, getStats: getYouTubeStats },
  tiktok: {
    getMeta: () => ({ id: "tiktok", displayName: "TikTok" }),
    getStats: async () => ({ followers: 0, avgEngagement: 0, growthThisMonth: 0 }),
  },
  youtube: {
    getMeta: () => ({ id: "youtube", displayName: "YouTube" }),
    getStats: async () => ({ followers: 0, avgEngagement: 0, growthThisMonth: 0 }),
  },
};

/** List of platform IDs that are enabled and have real adapters. */
export function getEnabledPlatformIds(): PlatformId[] {
  return ENABLED_PLATFORMS;
}

/** Get display metadata for a platform. */
export function getPlatformMeta(id: PlatformId): PlatformMeta {
  return PLATFORM_ADAPTERS[id].getMeta();
}

/**
 * Fetch stats for a creator across all enabled platforms.
 * @param handles - Optional map of platform id → handle (e.g. { instagram: "alexchen" })
 */
export async function getStatsForCreator(handles?: Partial<Record<PlatformId, string>>): Promise<
  Record<PlatformId, PlatformStats | PlatformStatsWithCharts>
> {
  const result = {} as Record<PlatformId, PlatformStats | PlatformStatsWithCharts>;
  for (const id of ENABLED_PLATFORMS) {
    const adapter = PLATFORM_ADAPTERS[id];
    result[id] = await adapter.getStats(handles?.[id]);
  }
  return result;
}
