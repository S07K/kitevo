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
  const id = await creatorPlanId(userId);
  return !!id && (PAID_CREATOR_TIERS as readonly string[]).includes(id);
}

const RANK: Record<string, number> = { starter: 1, pro: 2 };

/**
 * The creator's effective paid plan ("starter" | "pro") or null: the higher of comp and an
 * active subscription. Brands are never creators here. Reads the provider through the 60s
 * subscription cache; a lookup error falls back to the comp alone (fails closed).
 */
export async function creatorPlanId(userId: string): Promise<(typeof PAID_CREATOR_TIERS)[number] | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { compedTier: true, stripeCustomerId: true, accountType: true } });
  if (!user || user.accountType === "brand") return null;
  const paid = (id: string | null | undefined) => (id && (PAID_CREATOR_TIERS as readonly string[]).includes(id) ? (id as (typeof PAID_CREATOR_TIERS)[number]) : null);
  const comp = paid(getTierById(user.compedTier ?? null)?.id);
  let sub: ReturnType<typeof paid> = null;
  if (user.stripeCustomerId && comp !== "pro") {
    try {
      const s = await getCachedSubscription(user.stripeCustomerId);
      sub = s?.isActive ? paid(getTierByPriceId(s.priceId)?.id) : null;
    } catch (e) {
      console.error("[creator-plan] plan lookup failed:", e);
    }
  }
  return [comp, sub].filter(Boolean).sort((a, b) => RANK[b!] - RANK[a!])[0] ?? null;
}
