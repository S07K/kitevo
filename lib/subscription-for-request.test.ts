import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique, getSubscription } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getSubscription: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique } } }));
vi.mock("@/lib/payments", () => ({ payments: { getSubscription } }));
// Real config, so tier ids resolve to their true kit allowances.

import { getAllowedKitsForUser } from "./subscription-for-request";

/** An active subscription snapshot at the given product/price. */
const activeSub = (priceId: string) => ({
  id: "sub_1",
  customerId: "cus_1",
  status: "active" as const,
  priceId,
  isActive: true,
  itemId: "si_1",
});

// Stripe price ids the tests point at real tiers with; set so getKitsAllowedForPriceId
// maps them. pro = 3 kits, starter = 1.
beforeEach(() => {
  vi.stubEnv("PAYMENT_PROVIDER", "stripe");
  vi.stubEnv("STRIPE_PRICE_ID_PRO", "price_pro");
  vi.stubEnv("STRIPE_PRICE_ID_STARTER", "price_starter");
  findUnique.mockReset();
  getSubscription.mockReset().mockResolvedValue(null);
});

describe("getAllowedKitsForUser", () => {
  it("free (1 kit) when neither comp nor subscription", async () => {
    findUnique.mockResolvedValue({ stripeCustomerId: null, compedTier: null });
    expect(await getAllowedKitsForUser("u")).toBe(1);
  });

  it("grants the comped tier's kits with no subscription", async () => {
    findUnique.mockResolvedValue({ stripeCustomerId: null, compedTier: "pro" });
    expect(await getAllowedKitsForUser("u")).toBe(3);
    // A comp needs no payment lookup at all.
    expect(getSubscription).not.toHaveBeenCalled();
  });

  it("uses the subscription when there is no comp", async () => {
    findUnique.mockResolvedValue({ stripeCustomerId: "cus_1", compedTier: null });
    getSubscription.mockResolvedValue(activeSub("price_pro"));
    expect(await getAllowedKitsForUser("u")).toBe(3);
  });

  // The invariant: a real paid plan must never be reduced by a lower comp.
  it("takes the higher of comp and subscription", async () => {
    findUnique.mockResolvedValue({ stripeCustomerId: "cus_1", compedTier: "starter" });
    getSubscription.mockResolvedValue(activeSub("price_pro")); // pro=3 beats starter=1
    expect(await getAllowedKitsForUser("u")).toBe(3);
  });

  it("keeps the comp when the subscription has lapsed", async () => {
    findUnique.mockResolvedValue({ stripeCustomerId: "cus_1", compedTier: "pro" });
    getSubscription.mockResolvedValue(null); // no active sub
    expect(await getAllowedKitsForUser("u")).toBe(3);
  });

  it("falls back to free for a comp to an unknown tier", async () => {
    findUnique.mockResolvedValue({ stripeCustomerId: null, compedTier: "bogus" });
    expect(await getAllowedKitsForUser("u")).toBe(1);
  });
});
