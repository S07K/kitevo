/**
 * Parse Instagram Graph API insights responses for age breakdown (follower_demographics /
 * engaged_audience_demographics with breakdowns=age). See Meta IG User insights docs.
 */

import type { AudienceBucket, AudienceGenderSlice, AudienceCountrySlice } from "@/lib/platforms/types";

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

/** Generic: sum insight rows into `dimensionValue → count` for any single breakdown dimension. */
function parseBreakdownCounts(
  payload: InsightDemographicsPayload | null | undefined,
  dimKey: string
): { key: string; count: number }[] | undefined {
  const breakdowns = payload?.data?.[0]?.total_value?.breakdowns;
  if (!breakdowns?.length) return undefined;

  const buckets = new Map<string, number>();
  for (const block of breakdowns) {
    const keys = (block.dimension_keys ?? []).map((k) => k.toLowerCase());
    const idx = keys.indexOf(dimKey);
    if (idx < 0) continue;
    for (const row of block.results ?? []) {
      const raw = (row.dimension_values ?? [])[idx];
      if (raw == null || raw === "" || raw === "U" || raw === "UNKNOWN") continue;
      const v = typeof row.value === "number" ? row.value : 0;
      if (v <= 0) continue;
      buckets.set(raw, (buckets.get(raw) ?? 0) + v);
    }
  }
  if (buckets.size === 0) return undefined;
  return [...buckets.entries()].map(([key, count]) => ({ key, count }));
}

function pct1(n: number): number {
  return Math.round(n * 1000) / 10;
}

const GENDER_LABELS: Record<string, string> = { M: "Men", F: "Women", U: "Other" };

/** Gender split (Men / Women / Other), largest first, summing to ~100%. */
export function parseGenderInsight(
  payload: InsightDemographicsPayload | null | undefined
): AudienceGenderSlice[] | undefined {
  const counts = parseBreakdownCounts(payload, "gender");
  if (!counts?.length) return undefined;
  const total = counts.reduce((s, c) => s + c.count, 0);
  if (total <= 0) return undefined;
  return counts
    .map((c) => ({ gender: GENDER_LABELS[c.key] ?? c.key, pct: pct1(c.count / total) }))
    .sort((a, b) => b.pct - a.pct);
}

/** Top audience countries (ISO code → display name via Intl), largest first, max 5. */
export function parseCountryInsight(
  payload: InsightDemographicsPayload | null | undefined
): AudienceCountrySlice[] | undefined {
  const counts = parseBreakdownCounts(payload, "country");
  if (!counts?.length) return undefined;
  const total = counts.reduce((s, c) => s + c.count, 0);
  if (total <= 0) return undefined;

  let regionNames: Intl.DisplayNames | null = null;
  try {
    regionNames = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    regionNames = null;
  }

  return counts
    .map((c) => {
      const code = c.key.toUpperCase();
      let name = code;
      try {
        name = regionNames?.of(code) ?? code;
      } catch {
        name = code;
      }
      return { code, country: name, pct: pct1(c.count / total) };
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);
}
