import { describe, expect, it } from "vitest";
import {
  countsToAudienceBuckets,
  insightPayloadToAudienceBuckets,
  parseAgeDemographicsInsight,
} from "./instagram-demographics";

describe("parseAgeDemographicsInsight", () => {
  it("aggregates age across gender rows", () => {
    const payload = {
      data: [
        {
          name: "follower_demographics",
          total_value: {
            breakdowns: [
              {
                dimension_keys: ["timeframe", "gender", "age"],
                results: [
                  { dimension_values: ["LAST_90_DAYS", "F", "25-34"], value: 30 },
                  { dimension_values: ["LAST_90_DAYS", "M", "25-34"], value: 20 },
                  { dimension_values: ["LAST_90_DAYS", "F", "18-24"], value: 10 },
                ],
              },
            ],
          },
        },
      ],
    };
    const rows = parseAgeDemographicsInsight(payload);
    expect(rows).toEqual(
      expect.arrayContaining([
        { age: "25-34", count: 50 },
        { age: "18-24", count: 10 },
      ])
    );
    expect(rows).toHaveLength(2);
  });

  it("returns undefined when no age dimension", () => {
    expect(parseAgeDemographicsInsight({ data: [{ total_value: { breakdowns: [] } }] })).toBeUndefined();
    expect(parseAgeDemographicsInsight({ data: [] })).toBeUndefined();
  });
});

describe("insightPayloadToAudienceBuckets", () => {
  it("produces percentages that sum to 100", () => {
    const payload = {
      data: [
        {
          total_value: {
            breakdowns: [
              {
                dimension_keys: ["timeframe", "age"],
                results: [
                  { dimension_values: ["LAST_90_DAYS", "18-24"], value: 25 },
                  { dimension_values: ["LAST_90_DAYS", "25-34"], value: 75 },
                ],
              },
            ],
          },
        },
      ],
    };
    const buckets = insightPayloadToAudienceBuckets(payload)!;
    expect(buckets).toHaveLength(2);
    const sum = buckets.reduce((s, b) => s + b.pct, 0);
    expect(sum).toBeCloseTo(100, 0);
    const byAge = Object.fromEntries(buckets.map((b) => [b.age, b.pct]));
    expect(byAge["18-24"]).toBe(25);
    expect(byAge["25-34"]).toBe(75);
  });
});

describe("countsToAudienceBuckets", () => {
  it("sorts known age labels", () => {
    const out = countsToAudienceBuckets([
      { age: "35-44", count: 10 },
      { age: "18-24", count: 40 },
      { age: "25-34", count: 50 },
    ]);
    expect(out.map((b) => b.age)).toEqual(["18-24", "25-34", "35-44"]);
  });
});
