import { describe, it, expect } from "vitest";
import {
  hasManualStats,
  manualStatsToPlatformStats,
  normalizeManualStats,
  parseManualStats,
  serializeManualStats,
} from "./manual-stats";

describe("normalizeManualStats", () => {
  it("keeps valid headline numbers", () => {
    expect(
      normalizeManualStats({
        instagramFollowers: 12400,
        instagramEngagement: 4.26,
        youtubeSubscribers: 8100,
        youtubeTotalViews: 940000,
        growthThisMonth: 3.14,
      })
    ).toEqual({
      instagramFollowers: 12400,
      instagramEngagement: 4.3,
      youtubeSubscribers: 8100,
      youtubeTotalViews: 940000,
      growthThisMonth: 3.1,
    });
  });

  it("drops negatives, NaN, and non-numbers", () => {
    expect(
      normalizeManualStats({
        instagramFollowers: -5,
        instagramEngagement: NaN,
        youtubeSubscribers: "1000",
        youtubeTotalViews: Infinity,
        growthThisMonth: null,
      })
    ).toEqual({});
  });

  it("clamps engagement and growth to sane ranges", () => {
    expect(normalizeManualStats({ instagramEngagement: 850 })).toEqual({
      instagramEngagement: 100,
    });
    expect(normalizeManualStats({ growthThisMonth: -400 })).toEqual({
      growthThisMonth: -100,
    });
    expect(normalizeManualStats({ growthThisMonth: 5000 })).toEqual({
      growthThisMonth: 1000,
    });
  });

  it("ignores arrays and null input", () => {
    expect(normalizeManualStats([])).toEqual({});
    expect(normalizeManualStats(null)).toEqual({});
  });
});

describe("parseManualStats / serializeManualStats", () => {
  it("returns an empty object for missing or malformed JSON", () => {
    expect(parseManualStats(null)).toEqual({});
    expect(parseManualStats("not json")).toEqual({});
  });

  it("round-trips through JSON and strips invalid fields", () => {
    const json = serializeManualStats({
      instagramFollowers: 1200,
      youtubeSubscribers: -1,
    } as never);
    expect(JSON.parse(json)).toEqual({ instagramFollowers: 1200 });
    expect(parseManualStats(json)).toEqual({ instagramFollowers: 1200 });
  });
});

describe("manualStatsToPlatformStats", () => {
  it("builds Instagram headline stats without fabricating charts or demographics", () => {
    const stats = manualStatsToPlatformStats({
      instagramFollowers: 12000,
      instagramEngagement: 5,
      growthThisMonth: 2.4,
    });
    expect(stats.instagram).toEqual({
      followers: 12000,
      avgEngagement: 5,
      growthThisMonth: 2.4,
    });
    expect(stats.instagram.growthDataPoints).toBeUndefined();
    expect(stats.instagram.audienceDemographics).toBeUndefined();
  });

  it("builds YouTube headline stats", () => {
    const stats = manualStatsToPlatformStats({
      youtubeSubscribers: 8000,
      youtubeTotalViews: 240000,
    });
    expect(stats.youtube).toEqual({
      followers: 8000,
      avgEngagement: 0,
      growthThisMonth: 0,
      extra: { totalViews: 240000 },
    });
  });

  it("returns nothing when every value is zero or absent", () => {
    expect(manualStatsToPlatformStats({})).toEqual({});
    expect(manualStatsToPlatformStats({ instagramFollowers: 0 })).toEqual({});
  });
});

describe("hasManualStats", () => {
  it("is true only when a headline number exists", () => {
    expect(hasManualStats({})).toBe(false);
    expect(hasManualStats({ instagramFollowers: 0 })).toBe(false);
    expect(hasManualStats({ instagramFollowers: 1 })).toBe(true);
    expect(hasManualStats({ youtubeTotalViews: 10 })).toBe(true);
  });
});
