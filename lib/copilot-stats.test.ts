import { describe, it, expect } from "vitest";
import { statFacts, suggestRates, youtubeAvgViews } from "./copilot-stats";
import { rateEstimate } from "./creator-calculators";

describe("statFacts", () => {
  it("labels self-reported numbers as such", () => {
    expect(statFacts({ instagramFollowers: 12300, instagramEngagement: 3.5 }, {})).toEqual(["Instagram: 12.3K followers, 3.5% average engagement (self-reported by the creator)"]);
  });
  it("prefers live data per platform and adds the top country only when live", () => {
    const lines = statFacts(
      { instagramFollowers: 999 },
      { instagram: { followers: 48200, avgEngagement: 4.1, growthThisMonth: 0, audienceCountries: [{ code: "IN", country: "India", pct: 71.4 }] } },
    );
    expect(lines[0]).toBe("Instagram: 48.2K followers, 4.1% average engagement (live from the platform)");
    expect(lines[1]).toBe("Top Instagram audience country: India (71%, live)");
  });
  it("only states YouTube views per video when both totals are live", () => {
    expect(youtubeAvgViews({ followers: 1, avgEngagement: 0, growthThisMonth: 0, extra: { totalViews: 100000, videoCount: 40 } })).toBe(2500);
    expect(statFacts({ youtubeSubscribers: 5000, youtubeTotalViews: 90000 }, {})).toEqual(["YouTube: 5K subscribers (self-reported by the creator)"]);
  });
  it("says nothing without numbers", () => {
    expect(statFacts({}, {})).toEqual([]);
  });
});

describe("suggestRates", () => {
  it("uses the rate calculator's mid-points for the kit's own numbers", () => {
    const s = suggestRates({ instagramFollowers: 20000, instagramEngagement: 3 }, {}, ["Finance"])!;
    const calc = rateEstimate({ platform: "instagram", followers: 20000, engagement: 3, niche: "Finance" });
    if (!calc.ok) throw new Error("calc failed");
    expect(s.items).toEqual(calc.lines.map((l) => ({ label: l.label, price: l.mid })));
    expect(s.basis[0]).toContain("self-reported");
    expect(s.basis).toContain("Niche: Finance");
  });
  it("adds YouTube only with live views per video, caps at 8 items", () => {
    const s = suggestRates({ instagramFollowers: 20000 }, { youtube: { followers: 10000, avgEngagement: 0, growthThisMonth: 0, extra: { totalViews: 500000, videoCount: 50 } } }, [])!;
    expect(s.items.some((i) => i.label.startsWith("YouTube"))).toBe(true);
    expect(s.items.length).toBeLessThanOrEqual(8);
  });
  it("is null without any numbers", () => {
    expect(suggestRates({}, {}, ["Food"])).toBeNull();
  });
});
