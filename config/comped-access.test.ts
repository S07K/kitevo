import { describe, it, expect } from "vitest";
import {
  getTierById,
  getKitsAllowedForTier,
  getVerifiedTierForTier,
  resolveVerifiedTier,
} from "./subscriptions";

describe("comped tier lookups", () => {
  it("resolves a tier by id", () => {
    expect(getTierById("pro")?.name).toBe("Pro");
    expect(getTierById("brand")?.name).toBe("Brand Pro");
    expect(getTierById("nonsense")).toBeNull();
    expect(getTierById(null)).toBeNull();
  });

  it("grants the tier's kit allowance", () => {
    expect(getKitsAllowedForTier("pro")).toBe(3);
    expect(getKitsAllowedForTier("starter")).toBe(1);
    // Not a real tier: no grant, so downstream falls back to free.
    expect(getKitsAllowedForTier(null)).toBe(0);
    expect(getKitsAllowedForTier("bogus")).toBe(0);
  });

  it("grants the tier's verified badge", () => {
    expect(getVerifiedTierForTier("pro")).toBe("creator_pro");
    expect(getVerifiedTierForTier("brand")).toBe("brand_verified");
    expect(getVerifiedTierForTier(null)).toBeNull();
  });
});

describe("resolveVerifiedTier", () => {
  // The rule every write site uses: subscription wins, comp is the floor, else null.
  it("prefers an active subscription's badge over the comp", () => {
    expect(resolveVerifiedTier("brand_verified", "pro")).toBe("brand_verified");
  });

  it("falls back to the comp when there is no subscription badge", () => {
    // This is the case that matters: subscription lapsed/absent, comp keeps the badge.
    expect(resolveVerifiedTier(null, "pro")).toBe("creator_pro");
  });

  it("is null when neither a subscription nor a comp grants anything", () => {
    expect(resolveVerifiedTier(null, null)).toBeNull();
  });

  it("ignores a comp to an unknown tier", () => {
    expect(resolveVerifiedTier(null, "bogus")).toBeNull();
  });
});
