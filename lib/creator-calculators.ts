/**
 * The free tools' maths (/tools/rate-calculator, /tools/engagement-rate-calculator).
 *
 * Honesty: every number here is a published rule of thumb or our own weighting, NOT market
 * data, and the pages say so ("How the estimate works" prints these constants). Never
 * describe these results as "what creators like you earn" or cite a study we don't have.
 * Client-safe: no imports.
 */

export type Platform = "instagram" | "tiktok" | "youtube";

export const PLATFORM_LABEL: Record<Platform, string> = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" };

/** What a deliverable is priced from: followers (Instagram) or average views (TikTok, YouTube). */
export const RATE_BASIS: Record<Platform, "followers" | "views"> = { instagram: "followers", tiktok: "views", youtube: "views" };

/** Mid-point USD per 1,000 followers/views for the platform's reference deliverable. */
export const BASE_RATE_PER_1K: Record<Platform, number> = { instagram: 10, tiktok: 12, youtube: 25 };

export type Deliverable = { id: string; label: string; multiplier: number };

/** The reference deliverable has multiplier 1. */
export const DELIVERABLES: Record<Platform, Deliverable[]> = {
  instagram: [
    { id: "ig-story", label: "Instagram Story (1 frame)", multiplier: 0.35 },
    { id: "ig-post", label: "Instagram feed post", multiplier: 1 },
    { id: "ig-carousel", label: "Instagram carousel", multiplier: 1.15 },
    { id: "ig-reel", label: "Instagram Reel", multiplier: 1.4 },
  ],
  tiktok: [
    { id: "tt-video", label: "TikTok video", multiplier: 1 },
    { id: "tt-series", label: "TikTok series (3 videos)", multiplier: 2.6 },
  ],
  youtube: [
    { id: "yt-short", label: "YouTube Short", multiplier: 0.15 },
    { id: "yt-integration", label: "YouTube integration (60–90s)", multiplier: 0.5 },
    { id: "yt-dedicated", label: "Dedicated YouTube video", multiplier: 1 },
  ],
};

/**
 * Our weighting by niche: brands in niches with high customer value (finance, business,
 * tech) tend to pay more per view. Anything not listed is 1.
 */
export const NICHE_FACTOR: Record<string, number> = {
  Finance: 1.35,
  Business: 1.3,
  Tech: 1.25,
  Education: 1.1,
  Beauty: 1.1,
  Parenting: 1.1,
  Fashion: 1.05,
  Health: 1.05,
  Fitness: 1.05,
  Food: 0.95,
  Pets: 0.95,
  DIY: 0.95,
  Photography: 0.95,
  Gaming: 0.9,
  Music: 0.9,
  Art: 0.9,
  Comedy: 0.85,
};

/** Add-ons a brand can ask for, applied on top. */
export const ADD_ONS = {
  usageRights: { label: "Brand can use the content in its own ads (usage rights)", factor: 1.3 },
  exclusivity: { label: "No competing brands for a while (exclusivity)", factor: 1.25 },
} as const;

/** Engagement moves the price by at most this much either way. */
const ENGAGEMENT_FACTOR_RANGE = [0.75, 1.35] as const;
/** The quoted range around the mid-point. */
const RANGE = [0.75, 1.3] as const;
const MIN_MID = 20;

// ─── Engagement benchmarks ───────────────────────────────────────────────────

/**
 * Rough "typical" engagement rate (%) by audience size. Engagement falls as accounts grow.
 * Instagram and TikTok-by-followers use follower tiers; YouTube and TikTok-by-views measure
 * engagement against views instead, where size matters less.
 */
const FOLLOWER_TIERS: { upTo: number; instagram: number; tiktok: number }[] = [
  { upTo: 10_000, instagram: 4, tiktok: 6 },
  { upTo: 50_000, instagram: 3, tiktok: 5 },
  { upTo: 100_000, instagram: 2.2, tiktok: 4.5 },
  { upTo: 500_000, instagram: 1.6, tiktok: 4 },
  { upTo: 1_000_000, instagram: 1.3, tiktok: 3.5 },
  { upTo: Infinity, instagram: 1, tiktok: 3 },
];
const PER_VIEW_BENCHMARK: Record<"tiktok" | "youtube", number> = { tiktok: 6, youtube: 4 };

export type EngagementBasis = "followers" | "views";

export function engagementBenchmark(platform: Platform, basis: EngagementBasis, followers: number): number {
  if (platform === "youtube") return PER_VIEW_BENCHMARK.youtube;
  if (platform === "tiktok" && basis === "views") return PER_VIEW_BENCHMARK.tiktok;
  const tier = FOLLOWER_TIERS.find((t) => followers <= t.upTo) ?? FOLLOWER_TIERS[FOLLOWER_TIERS.length - 1];
  return platform === "tiktok" ? tier.tiktok : tier.instagram;
}

// ─── Engagement rate ─────────────────────────────────────────────────────────

export type EngagementInput = {
  platform: Platform;
  followers?: number;
  likes: number;
  comments: number;
  /** TikTok shares; Instagram saves + shares. Optional. */
  shares?: number;
  /** Average views per post/video. Required for YouTube, optional for TikTok. */
  views?: number;
};

export type Verdict = "low" | "below" | "healthy" | "strong";

export type EngagementResult =
  | { ok: false; error: string }
  | { ok: true; rate: number; basis: EngagementBasis; benchmark: number; verdict: Verdict; suspicious: boolean };

const pos = (n: number | undefined) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0);

export function engagementRate(input: EngagementInput): EngagementResult {
  const followers = pos(input.followers);
  const views = pos(input.views);
  const interactions = pos(input.likes) + pos(input.comments) + pos(input.shares);
  const basis: EngagementBasis = input.platform === "youtube" || (input.platform === "tiktok" && views > 0) ? "views" : "followers";
  const denominator = basis === "views" ? views : followers;
  if (!denominator) {
    return { ok: false, error: basis === "views" ? "Add your average views per video." : "Add your follower count." };
  }
  if (!interactions) return { ok: false, error: "Add your average likes and comments." };
  const rate = (interactions / denominator) * 100;
  const benchmark = engagementBenchmark(input.platform, basis, followers);
  const ratio = rate / benchmark;
  const verdict: Verdict = ratio < 0.6 ? "low" : ratio < 0.9 ? "below" : ratio < 1.5 ? "healthy" : "strong";
  return { ok: true, rate, basis, benchmark, verdict, suspicious: rate > 30 };
}

// ─── Rates ───────────────────────────────────────────────────────────────────

export type RateInput = {
  platform: Platform;
  followers?: number;
  views?: number;
  /** Engagement rate in %, if known. Unknown = neutral. */
  engagement?: number;
  niche?: string;
  usageRights?: boolean;
  exclusivity?: boolean;
};

export type RateLine = { id: string; label: string; low: number; mid: number; high: number };

export type RateResult =
  | { ok: false; error: string }
  | {
      ok: true;
      basis: "followers" | "views";
      lines: RateLine[];
      factors: { engagement: number; niche: number; addOns: number };
      benchmark: number | null;
    };

/** Round to a figure people would actually quote. */
export function niceRound(n: number): number {
  const step = n < 100 ? 5 : n < 1000 ? 10 : n < 5000 ? 25 : n < 20000 ? 50 : 100;
  return Math.max(step, Math.round(n / step) * step);
}

export function rateEstimate(input: RateInput): RateResult {
  const basis = RATE_BASIS[input.platform];
  const audience = basis === "views" ? pos(input.views) : pos(input.followers);
  if (!audience) return { ok: false, error: basis === "views" ? "Add your average views per video." : "Add your follower count." };

  let engagement = 1;
  let benchmark: number | null = null;
  if (pos(input.engagement)) {
    benchmark = engagementBenchmark(input.platform, input.platform === "instagram" ? "followers" : "views", pos(input.followers));
    const raw = Math.sqrt(pos(input.engagement) / benchmark);
    engagement = Math.min(ENGAGEMENT_FACTOR_RANGE[1], Math.max(ENGAGEMENT_FACTOR_RANGE[0], raw));
  }
  const niche = (input.niche && NICHE_FACTOR[input.niche]) || 1;
  const addOns = (input.usageRights ? ADD_ONS.usageRights.factor : 1) * (input.exclusivity ? ADD_ONS.exclusivity.factor : 1);

  const reference = (audience / 1000) * BASE_RATE_PER_1K[input.platform] * engagement * niche * addOns;
  const lines = DELIVERABLES[input.platform].map((d) => {
    const mid = Math.max(MIN_MID, reference * d.multiplier);
    return { id: d.id, label: d.label, low: niceRound(mid * RANGE[0]), mid: niceRound(mid), high: niceRound(mid * RANGE[1]) };
  });
  return { ok: true, basis, lines, factors: { engagement, niche, addOns }, benchmark };
}

// ─── Hand-off to the kit editor ──────────────────────────────────────────────

/** localStorage key the rate calculator writes and the kit editor offers to import. */
export const CALCULATOR_RATES_KEY = "kitevo:calculator-rates";

export type SavedCalculatorRates = { savedAt: number; items: { label: string; price: number }[] };

/** Saved rates older than this aren't offered (they'd be stale advice). */
export const CALCULATOR_RATES_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function parseSavedRates(raw: string | null, now = Date.now()): SavedCalculatorRates | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as SavedCalculatorRates;
    if (typeof v?.savedAt !== "number" || now - v.savedAt > CALCULATOR_RATES_TTL_MS || !Array.isArray(v.items)) return null;
    const items = v.items
      .filter((i) => typeof i?.label === "string" && i.label.trim() && Number.isFinite(i.price) && i.price > 0)
      .slice(0, 8)
      .map((i) => ({ label: i.label.slice(0, 60), price: Math.round(i.price) }));
    return items.length ? { savedAt: v.savedAt, items } : null;
  } catch {
    return null;
  }
}

export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: n >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}
