import { describe, it, expect, afterEach, vi } from "vitest";
import { betaCompFieldsForNewUser } from "./beta-comp";

afterEach(() => vi.unstubAllEnvs());

describe("betaCompFieldsForNewUser", () => {
  it("returns nothing when the flag is unset — signups stay normal", () => {
    vi.stubEnv("BETA_AUTO_COMP_TIER", "");
    expect(betaCompFieldsForNewUser()).toEqual({});
  });

  it("grants the tier's comp fields when set to a real tier", () => {
    vi.stubEnv("BETA_AUTO_COMP_TIER", "pro");
    expect(betaCompFieldsForNewUser()).toEqual({
      compedTier: "pro",
      verifiedTier: "creator_pro",
    });
  });

  it("is case and whitespace tolerant", () => {
    vi.stubEnv("BETA_AUTO_COMP_TIER", "  PRO  ");
    expect(betaCompFieldsForNewUser()).toMatchObject({ compedTier: "pro" });
  });

  // Fails safe: a typo in the env var must not break signup, just skip the comp.
  it("returns nothing (and does not throw) for an unknown tier", () => {
    vi.stubEnv("BETA_AUTO_COMP_TIER", "premium");
    expect(betaCompFieldsForNewUser()).toEqual({});
  });

  it("spreads cleanly into a create — empty when off adds no fields", () => {
    vi.stubEnv("BETA_AUTO_COMP_TIER", "");
    const data = { email: "a@b.com", ...betaCompFieldsForNewUser() };
    expect(data).toEqual({ email: "a@b.com" });
    expect("compedTier" in data).toBe(false);
  });
});
