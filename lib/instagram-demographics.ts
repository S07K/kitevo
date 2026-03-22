/**
 * Parse Instagram Graph API insights responses for age breakdown (follower_demographics /
 * engaged_audience_demographics with breakdowns=age). See Meta IG User insights docs.
 */

import type { AudienceBucket } from "@/lib/platforms/types";

export type InsightDemographicsPayload = {
  data?: Array<{
    name?: string;
    total_value?: {
      value?: number;
      breakdowns?: Array<{
        dimension_keys?: string[];
        results?: Array<{
          dimension_values?: string[];
          value?: number;
        }>;
      }>;
    };
  }>;
};

/** Known age bucket order for chart display (Meta uses labels like 18-24, 25-34, …). */
const AGE_BUCKET_ORDER = [
  "13-17",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
  "65",
];

function normalizeAgeLabel(raw: string): string {
  return raw.trim().replace(/\s*-\s*/g, "-");
}

/**
 * Aggregate raw insight breakdown rows into age → count (sums across gender / timeframe dims).
 */
export function parseAgeDemographicsInsight(
  payload: InsightDemographicsPayload | null | undefined
): { age: string; count: number }[] | undefined {
  const breakdowns = payload?.data?.[0]?.total_value?.breakdowns;
  if (!breakdowns?.length) return undefined;

  const buckets = new Map<string, number>();

  for (const block of breakdowns) {
    const keys = (block.dimension_keys ?? []).map((k) => k.toLowerCase());
    const ageIdx = keys.indexOf("age");
    if (ageIdx < 0) continue;

    for (const row of block.results ?? []) {
      const dims = row.dimension_values ?? [];
      const ageRaw = dims[ageIdx];
      if (ageRaw == null || ageRaw === "" || ageRaw === "U" || ageRaw === "UNKNOWN") continue;
      const v = typeof row.value === "number" ? row.value : 0;
      if (v <= 0) continue;
      const label = normalizeAgeLabel(ageRaw);
      buckets.set(label, (buckets.get(label) ?? 0) + v);
    }
  }

  if (buckets.size === 0) return undefined;
  return [...buckets.entries()].map(([age, count]) => ({ age, count }));
}

function sortAgeBuckets(buckets: AudienceBucket[]): AudienceBucket[] {
  return [...buckets].sort((a, b) => {
    const ia = AGE_BUCKET_ORDER.indexOf(a.age);
    const ib = AGE_BUCKET_ORDER.indexOf(b.age);
    if (ia === -1 && ib === -1) return a.age.localeCompare(b.age);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/** Convert counts to percentages that sum to ~100 for the bar chart. */
export function countsToAudienceBuckets(rows: { age: string; count: number }[]): AudienceBucket[] {
  const total = rows.reduce((s, r) => s + r.count, 0);
  if (total <= 0) return [];

  const raw = rows.map((r) => ({
    age: r.age,
    pct: (r.count / total) * 100,
  }));

  const rounded = raw.map((r) => ({
    age: r.age,
    pct: Math.round(r.pct * 10) / 10,
  }));

  const sum = rounded.reduce((s, r) => s + r.pct, 0);
  const drift = Math.round((100 - sum) * 10) / 10;
  if (rounded.length && Math.abs(drift) >= 0.05) {
    const last = rounded[rounded.length - 1];
    rounded[rounded.length - 1] = {
      ...last,
      pct: Math.round((last.pct + drift) * 10) / 10,
    };
  }

  return sortAgeBuckets(rounded);
}

export function insightPayloadToAudienceBuckets(
  payload: InsightDemographicsPayload | null | undefined
): AudienceBucket[] | undefined {
  const counts = parseAgeDemographicsInsight(payload);
  if (!counts?.length) return undefined;
  return countsToAudienceBuckets(counts);
}
