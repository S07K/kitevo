/**
 * Subscription tier helpers — re-exports from central config.
 * @see config/subscriptions.ts for the single source of truth.
 */

export {
  getKitsAllowedForPriceId,
  getVerifiedTierForPriceId,
  getTierByPriceId,
  getPriceIdForTier,
  getPublicTiers,
  SUBSCRIPTION_TIERS,
} from "@/config/subscriptions";
export type { SubscriptionTier } from "@/config/subscriptions";
