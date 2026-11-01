import { prisma } from "@/lib/prisma";
import { getTierByPriceId, getVerifiedTierForPriceId, resolveVerifiedTier } from "@/config/subscriptions";
import type { PaymentWebhookEvent } from "@/lib/payments";
import { trackEvent } from "@/lib/analytics";
import { applyRefundToCommission, recordCommissionForPayment } from "@/lib/referrals";
import { invalidateSubscription } from "@/lib/subscription-cache";

/**
 * Applies one provider-agnostic payment event to our database.
 *
 * Shared by the webhook route and the admin "replay" action, so a replay runs exactly the
 * code a live delivery would. Every branch is idempotent (tier writes are absolute,
 * commissions are keyed on paymentId, analytics use dedupe keys), which is what makes a
 * provider retry or an admin replay safe.
 *
 * Returns how it went; throws only on unexpected errors (DB down etc.), which the caller
 * records as a failed delivery.
 */
export type ApplyResult =
  | { status: "processed"; note?: string }
  | { status: "ignored"; note?: string }
  /** A valid event we could not act on (e.g. no matching user): money may be stranded. */
  | { status: "failed"; error: string };

/** Look up the local user (id + comp) for a provider customer id. */
async function findUserByCustomerId(
  customerId: string | null
): Promise<{ id: string; compedTier: string | null } | null> {
  if (!customerId) return null;
  return prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true, compedTier: true },
  });
}

/** Apply a payment domain event, then drop the cached status snapshot so the app reads it fresh. */
export async function applyPaymentEvent(event: PaymentWebhookEvent): Promise<ApplyResult> {
  try {
    return await applyPaymentEventInner(event);
  } finally {
    invalidateSubscription("customerId" in event ? (event.customerId as string | null | undefined) : null);
  }
}

async function applyPaymentEventInner(event: PaymentWebhookEvent): Promise<ApplyResult> {
  switch (event.type) {
    case "checkout.completed": {
      if (!event.customerId || !event.userId) {
        return {
          status: "failed",
          error: `checkout.completed missing ids (customer=${event.customerId}, user=${event.userId}); tier not granted`,
        };
      }
      // Badge from the purchased price, but a comp is the floor: a paying comped user
      // never loses their badge if the price somehow maps to none.
      const existing = await prisma.user.findUnique({
        where: { id: event.userId },
        select: { compedTier: true },
      });
      if (!existing) {
        return { status: "failed", error: `checkout.completed for unknown user ${event.userId}` };
      }
      const verifiedTier = resolveVerifiedTier(getVerifiedTierForPriceId(event.priceId), existing.compedTier);
      await prisma.user.update({
        where: { id: event.userId },
        data: { stripeCustomerId: event.customerId, verifiedTier },
      });
      // Dodo reports every renewal as checkout.completed too, so dedupe per user+price:
      // the funnel counts the first upgrade to each plan, not each billing cycle.
      await trackEvent("upgrade", {
        userId: event.userId,
        props: { tier: getTierByPriceId(event.priceId)?.id ?? null },
        dedupeKey: `upgrade:${event.userId}:${event.priceId ?? "unknown"}`,
      });
      return { status: "processed", note: `user ${event.userId} → ${verifiedTier ?? "no badge"}` };
    }

    case "subscription.changed": {
      const user = await findUserByCustomerId(event.customerId);
      if (!user) return { status: "failed", error: `no user for customer ${event.customerId}` };
      // Comp survives a subscription going inactive: resolve to comp, not null.
      const tier = resolveVerifiedTier(
        event.isActive ? getVerifiedTierForPriceId(event.priceId) : null,
        user.compedTier
      );
      await prisma.user.update({ where: { id: user.id }, data: { verifiedTier: tier } });
      return { status: "processed", note: `user ${user.id} → ${tier ?? "no badge"}` };
    }

    case "subscription.canceled": {
      const user = await findUserByCustomerId(event.customerId);
      if (!user) return { status: "failed", error: `no user for customer ${event.customerId}` };
      // Fall back to the comp if there is one, rather than clearing outright.
      const tier = resolveVerifiedTier(null, user.compedTier);
      await prisma.user.update({ where: { id: user.id }, data: { verifiedTier: tier } });
      await trackEvent("subscription_canceled", { userId: user.id });
      return { status: "processed", note: `user ${user.id} → ${tier ?? "no badge"}` };
    }

    case "payment.succeeded": {
      const result = await recordCommissionForPayment(event);
      return { status: "processed", note: `referral commission: ${result}` };
    }

    case "payment.refunded": {
      const result = await applyRefundToCommission({
        paymentId: event.paymentId,
        refundId: event.refundId,
        refundAmount: event.amount,
      });
      return { status: "processed", note: `referral commission: ${result}` };
    }

    case "ignored":
      return { status: "ignored", note: event.providerEventType };
  }
}
