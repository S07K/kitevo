import { describe, it, expect } from "vitest";
import { engagementRate, rateEstimate, niceRound, parseSavedRates, engagementBenchmark, CALCULATOR_RATES_TTL_MS } from "./creator-calculators";

describe("engagementRate", () => {
  it("Instagram: (likes + comments + saves/shares) / followers", () => {
    const r = engagementRate({ platform: "instagram", followers: 20_000, likes: 500, comments: 40, shares: 60 });
    expect(r).toMatchObject({ ok: true, basis: "followers", benchmark: 3, verdict: "healthy" });
    if (r.ok) expect(r.rate).toBeCloseTo(3, 5);
  });
  it("YouTube uses views; TikTok uses views when given, else followers", () => {
    expect(engagementRate({ platform: "youtube", likes: 400, comments: 100, views: 10_000 })).toMatchObject({ ok: true, basis: "views", benchmark: 4 });
    expect(engagementRate({ platform: "tiktok", followers: 5000, likes: 400, comments: 10, views: 8000 })).toMatchObject({ ok: true, basis: "views" });
    expect(engagementRate({ platform: "tiktok", followers: 5000, likes: 400, comments: 10 })).toMatchObject({ ok: true, basis: "followers", benchmark: 6 });
  });
  it("explains what's missing instead of dividing by zero", () => {
    expect(engagementRate({ platform: "youtube", likes: 5, comments: 1 })).toEqual({ ok: false, error: "Add your average views per video." });
    expect(engagementRate({ platform: "instagram", likes: 5, comments: 1 })).toEqual({ ok: false, error: "Add your follower count." });
    expect(engagementRate({ platform: "instagram", followers: 100, likes: 0, comments: 0 })).toMatchObject({ ok: false });
  });
  it("grades against the size-adjusted benchmark and flags implausible numbers", () => {
    expect(engagementRate({ platform: "instagram", followers: 2_000_000, likes: 5000, comments: 0 })).toMatchObject({ verdict: "low" });
    expect(engagementRate({ platform: "instagram", followers: 1000, likes: 500, comments: 0 })).toMatchObject({ verdict: "strong", suspicious: true });
  });
  it("benchmarks fall as accounts grow", () => {
    expect(engagementBenchmark("instagram", "followers", 5000)).toBeGreaterThan(engagementBenchmark("instagram", "followers", 5_000_000));
  });
});

describe("rateEstimate", () => {
  it("Instagram 50k followers, neutral: feed post ≈ $500, Reel above, Story below", () => {
    const r = rateEstimate({ platform: "instagram", followers: 50_000 });
    if (!r.ok) throw new Error(r.error);
    const by = Object.fromEntries(r.lines.map((l) => [l.id, l]));
    expect(by["ig-post"]).toEqual({ id: "ig-post", label: "Instagram feed post", low: 380, mid: 500, high: 650 });
    expect(by["ig-reel"].mid).toBeGreaterThan(by["ig-post"].mid);
    expect(by["ig-story"].mid).toBeLessThan(by["ig-post"].mid);
    for (const l of r.lines) expect(l.low <= l.mid && l.mid <= l.high).toBe(true);
  });
  it("engagement, niche and add-ons move the price, engagement within bounds", () => {
    const base = rateEstimate({ platform: "instagram", followers: 50_000 });
    const hot = rateEstimate({ platform: "instagram", followers: 50_000, engagement: 30, niche: "Finance", usageRights: true });
    const cold = rateEstimate({ platform: "instagram", followers: 50_000, engagement: 0.2 });
    if (!base.ok || !hot.ok || !cold.ok) throw new Error();
    expect(hot.factors.engagement).toBe(1.35);
    expect(cold.factors.engagement).toBe(0.75);
    expect(hot.factors.niche).toBe(1.35);
    expect(hot.lines[1].mid).toBeGreaterThan(base.lines[1].mid * 2);
  });
  it("TikTok and YouTube price from views and say so when they're missing", () => {
    expect(rateEstimate({ platform: "youtube", followers: 100_000 })).toEqual({ ok: false, error: "Add your average views per video." });
    const yt = rateEstimate({ platform: "youtube", views: 20_000 });
    expect(yt.ok && yt.lines.find((l) => l.id === "yt-dedicated")?.mid).toBe(500);
  });
  it("tiny accounts get a floor, not $3", () => {
    const r = rateEstimate({ platform: "instagram", followers: 300 });
    expect(r.ok && Math.min(...r.lines.map((l) => l.mid))).toBe(20);
  });
});

describe("niceRound", () => {
  it.each([[12, 10], [97, 95], [433, 430], [1234, 1225], [12_345, 12_350], [54_321, 54_300], [1, 5]])("%d → %d", (n, out) => expect(niceRound(n)).toBe(out));
});

describe("parseSavedRates", () => {
  const now = 1_800_000_000_000;
  it("accepts fresh, clean data and sanitises it", () => {
    const raw = JSON.stringify({ savedAt: now - 1000, items: [{ label: "Reel", price: 499.6 }, { label: "", price: 5 }, { label: "Bad", price: -1 }] });
    expect(parseSavedRates(raw, now)).toEqual({ savedAt: now - 1000, items: [{ label: "Reel", price: 500 }] });
  });
  it("drops stale, empty or junk data", () => {
    expect(parseSavedRates(JSON.stringify({ savedAt: now - CALCULATOR_RATES_TTL_MS - 1, items: [{ label: "A", price: 1 }] }), now)).toBeNull();
    expect(parseSavedRates("{nope", now)).toBeNull();
    expect(parseSavedRates(null, now)).toBeNull();
    expect(parseSavedRates(JSON.stringify({ savedAt: now, items: [] }), now)).toBeNull();
  });
});
