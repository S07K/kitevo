/**
 * Social platforms — single entry point for the app.
 *
 * Usage:
 * - getEnabledPlatformIds() → list of platform ids we show (e.g. ["instagram"]).
 * - getPlatformMeta(id) → display name, icon key for a platform.
 * - getStatsForCreator(handles?) → fetch stats for all enabled platforms (async).
 *
 * New developers: see docs/SETUP.md and lib/platforms/registry.ts for adding TikTok/YouTube.
 */

export {
  getEnabledPlatformIds,
  getPlatformMeta,
  getStatsForCreator,
  ENABLED_PLATFORMS,
} from "./registry";
export type { PlatformId, PlatformMeta, PlatformStats, PlatformStatsWithCharts, GrowthDataPoint, AudienceBucket } from "./types";
export { getInstagramRecentPosts } from "./instagram";
export type { FetchedPost } from "./instagram";
