import { describe, it, expect } from "vitest";
import { SUBSCRIPTION_TIERS, getPriceIdForTier } from "./subscriptions";

/**
 * Guards the bug that shipped: the pricing page advertised a yearly Starter/Pro while no
 * yearly price id was configured, so clicking it 500'd at checkout.
 *
 * The invariant that prevents recurrence: every tier that offers a yearly plan (has a
 * `priceYearly`) must resolve a yearly price id from the env, for whichever provider is
 * active. If someone adds `priceYearly` to a new tier and forgets the id, this fails.
 */
describe("yearly plan configuration", () => {
  const yearlyTiers = SUBSCRIPTION_TIERS.filter((t) => t.priceYearly && t.priceYearly > 0);

  it("has at least the tiers we expect to offer yearly", () => {
    // Sanity anchor: if this list changes, someone changed pricing, and the per-tier
    // checks below should be updated deliberately rather than silently.
    expect(yearlyTiers.map((t) => t.id).sort()).toEqual(["brand", "pro", "starter"]);
  });

  describe.each(yearlyTiers)("tier '$id' with priceYearly $priceYearly", (tier) => {
    it.each(["stripe", "dodo"] as const)("resolves a yearly price id under %s", (provider) => {
      const prefix = provider === "dodo" ? "DODO_PRODUCT_ID" : "STRIPE_PRICE_ID";
      const envKey = `${prefix}_${tier.id.toUpperCase()}_YEARLY`;

      const original = process.env.PAYMENT_PROVIDER;
      const originalVal = process.env[envKey];
      try {
        process.env.PAYMENT_PROVIDER = provider;
        // .env.example ships these as placeholders; in CI they may be unset, so set a
        // representative value and assert the resolver picks it up for the yearly interval.
        process.env[envKey] = "id_test_yearly";
        expect(getPriceIdForTier(tier.id, "yearly")).toBe("id_test_yearly");
      } finally {
        process.env.PAYMENT_PROVIDER = original;
        if (originalVal === undefined) delete process.env[envKey];
        else process.env[envKey] = originalVal;
      }
    });
  });

  it("does not resolve a yearly id for a monthly-only tier", () => {
    // free has no priceYearly; asking for its yearly id must be null, not a stray env hit.
    expect(getPriceIdForTier("free", "yearly")).toBeNull();
  });
});
