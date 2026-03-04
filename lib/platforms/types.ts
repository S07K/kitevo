/**
 * Social platform types — shared across Instagram, TikTok, YouTube (future).
 * Add new platform-specific fields here or in extended interfaces when needed.
 */

/** Supported platform identifiers. Add "youtube" | "tiktok" when integrating. */
export type PlatformId = "instagram" | "tiktok" | "youtube";

/** Common stats we show for every platform on the media kit. */
export interface PlatformStats {
  followers: number;
  avgEngagement: number;
  growthThisMonth: number;
  /** Optional platform-specific (e.g. following count, posts, total likes). */
  extra?: Record<string, number | string>;
}

/** Display metadata for a platform (name, icon key, etc.). */
export interface PlatformMeta {
  id: PlatformId;
  displayName: string;
  /** For future: icon component or path. */
  iconKey?: string;
}

/** Monthly data point for growth chart (used by Instagram for now). */
export interface GrowthDataPoint {
  month: string;
  followers: number;
}

/** Age bucket for audience demographics. */
export interface AudienceBucket {
  age: string;
  pct: number;
}

/**
 * Extended stats for platforms that support growth chart + demographics (e.g. Instagram).
 * Other platforms can return only PlatformStats.
 */
export interface PlatformStatsWithCharts extends PlatformStats {
  growthDataPoints?: GrowthDataPoint[];
  audienceDemographics?: AudienceBucket[];
}
