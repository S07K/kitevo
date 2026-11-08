import { compactNumber } from "@/lib/kit-audience-summary";
import { NICHE_FACTOR, rateEstimate, type RateInput } from "@/lib/creator-calculators";
import { manualStatsToPlatformStats, type ManualStats } from "@/lib/manual-stats";
import type { LiveKitStats } from "@/lib/kit-stats-compose";
import type { PlatformStatsWithCharts } from "@/lib/platforms/types";

/**
 * The creator's numbers as Copilot sees them: fact lines that name their source, and the
 * inputs for rate suggestions. Live data wins per platform (same rule as the kit); manual
 * numbers are labelled self-reported. Pure and client-safe.
 */

type Source = "live" | "self-reported";
type Platform = { stats: PlatformStatsWithCharts; source: Source };

function platforms(manual: ManualStats, live: LiveKitStats): { instagram?: Platform; youtube?: Platform } {
  const m = manualStatsToPlatformStats(manual);
  const pick = (id: "instagram" | "youtube"): Platform | undefined =>
    live[id] ? { stats: live[id]!, source: "live" } : m[id] ? { stats: m[id], source: "self-reported" } : undefined;
  return { instagram: pick("instagram"), youtube: pick("youtube") };
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : 0);

/** Average views per video, only when both totals are known (live YouTube). */
export function youtubeAvgViews(s: PlatformStatsWithCharts | undefined): number {
  const total = num(s?.extra?.totalViews);
  const videos = num(s?.extra?.videoCount);
  return total > 0 && videos > 0 ? Math.round(total / videos) : 0;
}

export function statFacts(manual: ManualStats, live: LiveKitStats): string[] {
  const p = platforms(manual, live);
  const lines: string[] = [];
  const tag = (s: Source) => (s === "live" ? "live from the platform" : "self-reported by the creator");
  if (p.instagram && p.instagram.stats.followers > 0) {
    const s = p.instagram.stats;
    const parts = [`${compactNumber(s.followers)} followers`];
    if (s.avgEngagement > 0) parts.push(`${s.avgEngagement.toFixed(1)}% average engagement`);
    if (s.growthThisMonth > 0) parts.push(`${s.growthThisMonth.toFixed(1)}% follower growth in the last 30 days`);
    lines.push(`Instagram: ${parts.join(", ")} (${tag(p.instagram.source)})`);
    const top = p.instagram.source === "live" ? s.audienceCountries?.[0] : undefined;
    if (top && top.pct > 0) lines.push(`Top Instagram audience country: ${top.country} (${Math.round(top.pct)}%, live)`);
  }
  if (p.youtube && p.youtube.stats.followers > 0) {
    const parts = [`${compactNumber(p.youtube.stats.followers)} subscribers`];
    const avg = p.youtube.source === "live" ? youtubeAvgViews(p.youtube.stats) : 0;
    if (avg > 0) parts.push(`about ${compactNumber(avg)} views per video`);
    lines.push(`YouTube: ${parts.join(", ")} (${tag(p.youtube.source)})`);
  }
  return lines;
}

export type SuggestedRates = {
  items: { label: string; price: number }[];
  /** What the numbers were based on, for the "how" line under the suggestion. */
  basis: string[];
};

/**
 * Rate card suggestion from the kit's own numbers via the rate calculator's formulas
 * (lib/creator-calculators — rules of thumb, shown on /tools/rate-calculator). Mid-point of
 * each range. No AI involved, so no number is ever made up.
 */
export function suggestRates(manual: ManualStats, live: LiveKitStats, niches: string[]): SuggestedRates | null {
  const p = platforms(manual, live);
  const niche = niches.find((n) => NICHE_FACTOR[n]) ?? niches[0];
  const items: SuggestedRates["items"] = [];
  const basis: string[] = [];

  const add = (input: RateInput, note: string) => {
    const r = rateEstimate(input);
    if (!r.ok) return;
    for (const l of r.lines) items.push({ label: l.label, price: l.mid });
    basis.push(note);
  };

  if (p.instagram && p.instagram.stats.followers > 0) {
    const s = p.instagram.stats;
    add(
      { platform: "instagram", followers: s.followers, engagement: s.avgEngagement > 0 ? s.avgEngagement : undefined, niche },
      `Instagram: ${compactNumber(s.followers)} followers${s.avgEngagement > 0 ? `, ${s.avgEngagement.toFixed(1)}% engagement` : ""} (${p.instagram.source === "live" ? "live" : "self-reported"})`,
    );
  }
  const avg = youtubeAvgViews(p.youtube?.stats);
  if (p.youtube && avg > 0) {
    add({ platform: "youtube", views: avg, followers: p.youtube.stats.followers, niche }, `YouTube: about ${compactNumber(avg)} views per video (live)`);
  }
  if (!items.length) return null;
  if (niche && NICHE_FACTOR[niche]) basis.push(`Niche: ${niche}`);
  return { items: items.slice(0, 8), basis };
}
