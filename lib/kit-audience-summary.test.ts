import { describe, it, expect } from "vitest";
import { audienceSummary, type SummarySegment } from "./kit-audience-summary";

const text = (s: SummarySegment[][]) => s.map((x) => x.map((p) => p.text).join("")).join(" ");

describe("audienceSummary", () => {
  it("builds the full sentence from real Instagram data", () => {
    const s = audienceSummary({
      name: "Alex Chen",
      instagram: { followers: 52_000, engagement: 4.2 },
      gender: [{ gender: "Men", pct: 42 }, { gender: "Women", pct: 58 }],
      age: [{ age: "18-24", pct: 34 }, { age: "25-34", pct: 42 }],
      countries: [{ country: "United States", pct: 38.4 }, { country: "Canada", pct: 9.7 }],
    });
    expect(text(s)).toBe(
      "52K people follow Alex on Instagram. The audience is 58% women, most often aged 25–34, and largest in the United States. A typical post gets 4.2% engagement.",
    );
    expect(s[0][0]).toEqual({ text: "52K", strong: true });
  });

  it("drops every clause it has no data for", () => {
    expect(text(audienceSummary({ name: "Sam", instagram: { followers: 9_400 } }))).toBe("9.4K people follow Sam on Instagram.");
    expect(audienceSummary({ name: "Sam" })).toEqual([]);
  });

  it("doesn't call a near-even split a gender skew", () => {
    const s = audienceSummary({ name: "Sam", instagram: { followers: 1000 }, gender: [{ gender: "Women", pct: 51 }], countries: [{ country: "India", pct: 40 }] });
    expect(text(s)).toBe("1K people follow Sam on Instagram. The audience is largest in India.");
  });

  it("combines platforms, and falls back to YouTube views for typical performance", () => {
    expect(text(audienceSummary({ name: "Jo Lee", instagram: { followers: 30_000 }, youtube: { subscribers: 20_000, avgViews: 18_200 } }))).toBe(
      "50K people follow Jo across Instagram and YouTube. A typical video gets 18.2K views.",
    );
  });

  it("words self-reported numbers as the creator's claim and adds nothing measured", () => {
    const s = audienceSummary({
      name: "Ria",
      selfReported: true,
      instagram: { followers: 12_000, engagement: 5 },
      youtube: { subscribers: 3_000 },
      countries: [{ country: "United Kingdom", pct: 50 }],
    });
    expect(text(s)).toBe("Ria reports 12K followers on Instagram and 3K subscribers on YouTube.");
  });

  it("rounds like the stat strip, so the sentence and the numbers agree", () => {
    expect(text(audienceSummary({ name: "Sam", selfReported: true, instagram: { followers: 12_500 } }))).toBe("Sam reports 12.5K followers on Instagram.");
  });

  it("two audience clauses join with 'and'", () => {
    const s = audienceSummary({ name: "A", instagram: { followers: 2000 }, age: [{ age: "18-24", pct: 50 }], countries: [{ country: "Netherlands", pct: 30 }] });
    expect(text(s)).toContain("The audience is most often aged 18–24 and largest in the Netherlands.");
  });
});
