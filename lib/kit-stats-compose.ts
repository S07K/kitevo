import type { PlatformId, PlatformStatsWithCharts } from "@/lib/platforms/types";
import { EMPTY_MANUAL_STATS, manualStatsToPlatformStats, type ManualStats } from "@/lib/manual-stats";

/** Live stats per connected platform (Starter+ only; absent when not connected). */
export type LiveKitStats = Partial<Record<"instagram" | "youtube", PlatformStatsWithCharts>>;

export type ComposedKitStats = {
  platformStats: Record<string, PlatformStatsWithCharts>;
  enabledPlatformIds: PlatformId[];
  statsSource: "live" | "manual" | "mixed" | "none";
};

/**
 * Headline stats for a kit. Manual numbers are the fallback; live data replaces them per
 * connected platform, so a paid creator never sees a stale self-reported number where a
 * verified one exists. Client-safe: the public page (server) and the editor's live preview
 * (browser, while the creator types) use the same rules.
 */
export function composeKitStats(manualStats: ManualStats | null | undefined, live: LiveKitStats): ComposedKitStats {
  const manualPlatformStats = manualStatsToPlatformStats(manualStats ?? EMPTY_MANUAL_STATS);
  const platformStats: Record<string, PlatformStatsWithCharts> = { ...manualPlatformStats, ...live };
  const manualOnly = Object.keys(manualPlatformStats).filter((id) => !(id in live));
  const hasLive = Object.keys(live).length > 0;
  const statsSource: ComposedKitStats["statsSource"] = hasLive
    ? manualOnly.length > 0
      ? "mixed"
      : "live"
    : Object.keys(platformStats).length > 0
      ? "manual"
      : "none";
  return { platformStats, enabledPlatformIds: Object.keys(platformStats) as PlatformId[], statsSource };
}
