/**
 * Subscription tiers — single source of truth.
 * Add or edit tiers here; Stripe Price IDs come from env (see getPriceIdForTier).
 *
 * Env vars: STRIPE_PRICE_ID_STARTER, STRIPE_PRICE_ID_PRO (and STRIPE_PRICE_ID_<TIER_ID_UPPER> for more tiers).
 */

export interface SubscriptionTier {
  id: string;
  name: string;
  /** Display price in USD per month */
  priceMonthly: number;
  /** Max media kits allowed on this tier */
  kitsAllowed: number;
  /** Short feature list for pricing page */
  features: string[];
  /** Optional: "popular" badge, order, etc. */
  highlight?: boolean;
}

/** All tiers in display order. Change prices and limits here; add new tiers by appending. */
export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    kitsAllowed: 1,
    features: [
      "1 media kit",
      "Shareable link",
      "Basic profile & bio",
      "Rates & brand partners",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 9,
    kitsAllowed: 1,
    features: [
      "1 media kit",
      "Professional shareable link",
      "Live stats & growth charts",
      "Work samples & rates",
      "Section visibility controls",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 15,
    kitsAllowed: 3,
    features: [
      "3 media kits",
      "Everything in Starter",
      "Multiple shareable links",
      "Ideal for multi-brand pitches",
    ],
    highlight: true,
  },
];

export type BillingInterval = "monthly" | "yearly";

/** Resolve Stripe Price ID for a tier + interval.
 *  Monthly env: STRIPE_PRICE_ID_STARTER, STRIPE_PRICE_ID_PRO
 *  Yearly env:  STRIPE_PRICE_ID_STARTER_YEARLY, STRIPE_PRICE_ID_PRO_YEARLY
 */
export function getPriceIdForTier(tierId: string, interval: BillingInterval = "monthly"): string | null {
  const suffix = interval === "yearly" ? "_YEARLY" : "";
  const key = `STRIPE_PRICE_ID_${tierId.toUpperCase().replace(/-/g, "_")}${suffix}` as keyof typeof process.env;
  const value = process.env[key];
  return typeof value === "string" && value ? value : null;
}

/** Get tier by Stripe Price ID — checks both monthly and yearly IDs. */
export function getTierByPriceId(priceId: string | null): SubscriptionTier | null {
  if (!priceId) return null;
  for (const tier of SUBSCRIPTION_TIERS) {
    if (getPriceIdForTier(tier.id, "monthly") === priceId) return tier;
    if (getPriceIdForTier(tier.id, "yearly") === priceId) return tier;
  }
  return null;
}

/** Kits allowed for a given Price ID. Used by subscription-status. */
export function getKitsAllowedForPriceId(priceId: string | null): number {
  const tier = getTierByPriceId(priceId);
  return tier?.kitsAllowed ?? 0;
}

/** Public tier list for pricing page (no secrets). */
export function getPublicTiers(): SubscriptionTier[] {
  return SUBSCRIPTION_TIERS;
}
