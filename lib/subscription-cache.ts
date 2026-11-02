import { unstable_cache, revalidateTag } from "next/cache";
import { payments } from "@/lib/payments";
import type { SubscriptionSnapshot } from "@/lib/payments/types";

/**
 * Short-lived cache for the *read-only* subscription lookup behind /api/subscription-status.
 * That route runs on every dashboard / settings / pricing load, and each miss is a live
 * round-trip to the payment provider. Writes stay authoritative: every path that changes a
 * plan (payment webhook events, in-app upgrade, admin resync) calls invalidateSubscription,
 * so the next read is fresh. Webhooks, upgrades and admin actions themselves never read
 * through this cache.
 */
const TTL_SECONDS = 60;

export const subscriptionTag = (customerId: string) => `subscription:${customerId}`;

export async function getCachedSubscription(customerId: string): Promise<SubscriptionSnapshot | null> {
  try {
    return await unstable_cache(() => payments.getSubscription(customerId), ["provider-subscription", customerId], {
      revalidate: TTL_SECONDS,
      tags: [subscriptionTag(customerId)],
    })();
  } catch {
    // Outside a Next request (scripts, tests) there is no cache: read straight through.
    return payments.getSubscription(customerId);
  }
}

/** Drop the cached snapshot so the next status read hits the provider. Never throws. */
export function invalidateSubscription(customerId: string | null | undefined) {
  if (!customerId) return;
  try {
    revalidateTag(subscriptionTag(customerId), { expire: 0 });
  } catch {
    /* no Next cache in this context (tests/scripts) */
  }
}
