import { prisma } from "@/lib/prisma";
import { payments, type SubscriptionSnapshot } from "@/lib/payments";
import { getTierById, getVerifiedTierForPriceId, resolveVerifiedTier } from "@/config/subscriptions";

/**
 * Admin-side plan changes, each written to `AdminAuditLog`.
 *
 * Shared by /admin and scripts/comp-user.ts so both compute the badge the same way: ask the
 * provider for the live subscription, then apply `resolveVerifiedTier` (subscription wins,
 * comp is the floor). The old script set the badge from the comp alone, so revoking a comp
 * from a paying user cleared their badge until the next sync.
 */

export type AuditAction = "comp.set" | "plan.resync" | "webhook.replay";

/** Never throws: an audit write failing must not undo the change it describes. */
export async function logAdminAction(
  actor: string,
  action: AuditAction,
  targetUserId: string | null,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: { actor, action, targetUserId, details: JSON.stringify(details) },
    });
  } catch (e) {
    console.error("[admin-audit] failed to record", action, e);
  }
}

/** "top_creator" (gold) is hand-granted and no plan produces it, so plan syncs leave it alone. */
const MANUAL_BADGES = new Set(["top_creator"]);

export class AdminActionError extends Error {}

type PlanUser = { id: string; stripeCustomerId: string | null; compedTier: string | null; verifiedTier: string | null };

/** The customer's latest subscription (any state), or null when they have no customer id. */
async function liveSubscription(customerId: string | null): Promise<SubscriptionSnapshot | null> {
  if (!customerId) return null;
  try {
    return await payments.getSubscription(customerId);
  } catch (e) {
    // Fail without writing: guessing "no subscription" would strip a paying user's badge.
    throw new AdminActionError(
      `Couldn't reach ${payments.id} for customer ${customerId}: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

function badgeFor(user: PlanUser, sub: SubscriptionSnapshot | null, compedTier: string | null): string | null {
  if (user.verifiedTier && MANUAL_BADGES.has(user.verifiedTier)) return user.verifiedTier;
  return resolveVerifiedTier(sub?.isActive ? getVerifiedTierForPriceId(sub.priceId) : null, compedTier);
}

async function loadPlanUser(userId: string): Promise<PlanUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, stripeCustomerId: true, compedTier: true, verifiedTier: true },
  });
  if (!user) throw new AdminActionError("User not found.");
  return user;
}

/** Grant (tier id) or revoke (null) comped access, then re-derive the badge. */
export async function setComp(userId: string, tierId: string | null, actor: string) {
  if (tierId !== null && (!getTierById(tierId) || tierId === "free")) {
    throw new AdminActionError(`Unknown tier "${tierId}".`);
  }
  const user = await loadPlanUser(userId);
  const sub = await liveSubscription(user.stripeCustomerId);
  const verifiedTier = badgeFor(user, sub, tierId);

  await prisma.user.update({ where: { id: userId }, data: { compedTier: tierId, verifiedTier } });
  const change = {
    before: { compedTier: user.compedTier, verifiedTier: user.verifiedTier },
    after: { compedTier: tierId, verifiedTier },
  };
  await logAdminAction(actor, "comp.set", userId, change);
  return change.after;
}

/**
 * Re-derive the badge from the provider's current subscription + comp. The fix for a
 * missed or out-of-order webhook, and safer than replaying an old event.
 */
export async function resyncPlan(userId: string, actor: string) {
  const user = await loadPlanUser(userId);
  const sub = await liveSubscription(user.stripeCustomerId);
  const verifiedTier = badgeFor(user, sub, user.compedTier);

  if (verifiedTier !== user.verifiedTier) {
    await prisma.user.update({ where: { id: userId }, data: { verifiedTier } });
  }
  const after = { verifiedTier, subscriptionStatus: sub?.status ?? null, priceId: sub?.priceId ?? null };
  await logAdminAction(actor, "plan.resync", userId, { before: { verifiedTier: user.verifiedTier }, after });
  return after;
}
