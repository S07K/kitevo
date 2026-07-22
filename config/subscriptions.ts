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
  /** Display price in USD per year (optional; for a monthly/yearly toggle). */
  priceYearly?: number;
  /** Max media kits allowed on this tier */
  kitsAllowed: number;
  /** Short feature list for pricing page */
  features: string[];
  /** Optional: "popular" badge, order, etc. */
  highlight?: boolean;
  /** Which side of the marketplace this plan is for. Defaults to "creator". */
  audience?: "creator" | "brand";
  /** verifiedTier granted on User while this plan is active. null = no badge. */
  verifiedTier?: string | null;
}

/** All tiers in display order. Change prices and limits here; add new tiers by appending. */
export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    kitsAllowed: 1,
    audience: "creator",
    verifiedTier: null,
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
    audience: "creator",
    verifiedTier: "creator_pro",
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
    audience: "creator",
    verifiedTier: "creator_pro",
    features: [
      "3 media kits",
      "Everything in Starter",
      "Multiple shareable links",
      "Ideal for multi-brand pitches",
    ],
    highlight: true,
  },
  {
    id: "brand",
    name: "Brand Pro",
    priceMonthly: 29,
    priceYearly: 290,
    kitsAllowed: 0,
    audience: "brand",
    verifiedTier: "brand_verified",
    features: [
      "Verified brand badge",
      "Unlimited open campaigns",
      "Message any creator directly",
      "Priority placement in discovery",
    ],
  },
];

export type BillingInterval = "monthly" | "yearly";

/**
 * Resolve the active provider's price/product id for a tier + interval.
 *
 * Each provider names the concept differently and the ids are not interchangeable, so
 * they live under separate env prefixes and switching provider does not require
 * re-entering the other one's ids:
 *
 *   Stripe: STRIPE_PRICE_ID_STARTER,   STRIPE_PRICE_ID_BRAND_YEARLY
 *   Dodo:   DODO_PRODUCT_ID_STARTER,   DODO_PRODUCT_ID_BRAND_YEARLY
 *
 * Reads PAYMENT_PROVIDER directly rather than importing lib/payments, because that module
 * pulls in provider SDKs and this config is imported by client components too.
 */
export function getPriceIdForTier(tierId: string, interval: BillingInterval = "monthly"): string | null {
  const prefix = process.env.PAYMENT_PROVIDER === "dodo" ? "DODO_PRODUCT_ID" : "STRIPE_PRICE_ID";
  const suffix = interval === "yearly" ? "_YEARLY" : "";
  const key = `${prefix}_${tierId.toUpperCase().replace(/-/g, "_")}${suffix}` as keyof typeof process.env;
  const value = process.env[key];
  return typeof value === "string" && value ? value : null;
}

/** Get tier by the provider's price/product id — checks both monthly and yearly. */
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

/** verifiedTier (badge) granted by a given Price ID's plan. Null if none / unknown. */
export function getVerifiedTierForPriceId(priceId: string | null): string | null {
  return getTierByPriceId(priceId)?.verifiedTier ?? null;
}

/** Public tier list for a given audience (no secrets). Defaults to creator plans. */
export function getPublicTiers(audience: "creator" | "brand" = "creator"): SubscriptionTier[] {
  return SUBSCRIPTION_TIERS.filter((t) => (t.audience ?? "creator") === audience);
}
