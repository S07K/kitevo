/**
 * Creator-reported stats for kits without a connected platform.
 *
 * These are deliberately limited to headline numbers. Growth charts and audience
 * demographics are only rendered from real platform data — manual entries must never be
 * turned into a fabricated chart.
 */

import type { PlatformStatsWithCharts } from "@/lib/platforms/types";

export interface ManualStats {
  instagramFollowers?: number;
  /** Average engagement rate, percent (e.g. 4.2). */
  instagramEngagement?: number;
  youtubeSubscribers?: number;
  youtubeTotalViews?: number;
  /** Follower growth over the last 30 days, percent. */
  growthThisMonth?: number;
}

export const EMPTY_MANUAL_STATS: ManualStats = {};

function numberOrUndefined(value: unknown, allowNegative = false): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (!allowNegative && value < 0) return undefined;
  return value;
}

function wholeNumber(value: unknown): number | undefined {
  const n = numberOrUndefined(value);
  return n === undefined ? undefined : Math.round(n);
}

function percentage(value: unknown, allowNegative = false): number | undefined {
  const n = numberOrUndefined(value, allowNegative);
  if (n === undefined) return undefined;
  if (!allowNegative && n > 100) return 100;
  return Math.round(n * 10) / 10;
}

/** Coerce untrusted JSON into a safe ManualStats object. */
export function normalizeManualStats(input: unknown): ManualStats {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const o = input as Record<string, unknown>;
  const stats: ManualStats = {};

  const instagramFollowers = wholeNumber(o.instagramFollowers);
  if (instagramFollowers !== undefined) stats.instagramFollowers = instagramFollowers;

  const instagramEngagement = percentage(o.instagramEngagement);
  if (instagramEngagement !== undefined) stats.instagramEngagement = instagramEngagement;

  const youtubeSubscribers = wholeNumber(o.youtubeSubscribers);
  if (youtubeSubscribers !== undefined) stats.youtubeSubscribers = youtubeSubscribers;

  const youtubeTotalViews = wholeNumber(o.youtubeTotalViews);
  if (youtubeTotalViews !== undefined) stats.youtubeTotalViews = youtubeTotalViews;

  // Growth can be negative. Keep it bounded to a plausible -100..1000% range.
  const growth = percentage(o.growthThisMonth, true);
  if (growth !== undefined) stats.growthThisMonth = Math.max(-100, Math.min(1000, growth));

  return stats;
}

export function parseManualStats(raw: string | null | undefined): ManualStats {
  if (!raw) return {};
  try {
    return normalizeManualStats(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

export function serializeManualStats(stats: ManualStats): string {
  return JSON.stringify(normalizeManualStats(stats));
}

/** True when at least one manual value would render something. */
export function hasManualStats(stats: ManualStats): boolean {
  return (
    (stats.instagramFollowers ?? 0) > 0 ||
    (stats.instagramEngagement ?? 0) > 0 ||
    (stats.youtubeSubscribers ?? 0) > 0 ||
    (stats.youtubeTotalViews ?? 0) > 0
  );
}

/** Convert manual entries into the same shape the public kit already renders. */
export function manualStatsToPlatformStats(
  stats: ManualStats
): Record<string, PlatformStatsWithCharts> {
  const result: Record<string, PlatformStatsWithCharts> = {};

  if (
    (stats.instagramFollowers ?? 0) > 0 ||
    (stats.instagramEngagement ?? 0) > 0 ||
    (stats.growthThisMonth ?? 0) !== 0
  ) {
    result.instagram = {
      followers: stats.instagramFollowers ?? 0,
      avgEngagement: stats.instagramEngagement ?? 0,
      growthThisMonth: stats.growthThisMonth ?? 0,
    };
  }

  if ((stats.youtubeSubscribers ?? 0) > 0 || (stats.youtubeTotalViews ?? 0) > 0) {
    result.youtube = {
      followers: stats.youtubeSubscribers ?? 0,
      avgEngagement: 0,
      growthThisMonth: 0,
      ...(stats.youtubeTotalViews
        ? { extra: { totalViews: stats.youtubeTotalViews } }
        : {}),
    };
  }

  return result;
}
