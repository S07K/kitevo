import { prisma } from "@/lib/prisma";
import { getCachedSubscription } from "@/lib/subscription-cache";
import { getTierById, getTierByPriceId } from "@/config/subscriptions";

/** Creator plans that unlock paid features (custom domains, paid products). */
export const PAID_CREATOR_TIERS = ["starter", "pro"] as const;

/**
 * Whether a creator is on Starter or Pro: best of comp and active subscription (comp is the
 * floor, an active subscription can only raise it). Brands are never creators here. Reads
 * the provider through the 60s subscription cache, and fails closed on a lookup error.
 */
export async function hasPaidCreatorPlan(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { compedTier: true, stripeCustomerId: true, accountType: true } });
  if (!user || user.accountType === "brand") return false;
  const ok = (id: string | null | undefined) => !!id && (PAID_CREATOR_TIERS as readonly string[]).includes(id);
  if (ok(getTierById(user.compedTier ?? null)?.id)) return true;
  if (!user.stripeCustomerId) return false;
  try {
    const sub = await getCachedSubscription(user.stripeCustomerId);
    return !!sub?.isActive && ok(getTierByPriceId(sub.priceId)?.id);
  } catch (e) {
    console.error("[creator-plan] plan lookup failed:", e);
    return false;
  }
}
