import { NextResponse } from "next/server";
import { invalidateSubscription } from "@/lib/subscription-cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payments } from "@/lib/payments";
import { getCachedSubscription } from "@/lib/subscription-cache";
import {
  setSubscriptionCookie,
  getSubscriptionCustomerId,
  clearSubscriptionCookie,
} from "@/lib/subscription-cookie";
import {
  getKitsAllowedForPriceId,
  getTierByPriceId,
  getVerifiedTierForPriceId,
  getTierById,
  getKitsAllowedForTier,
  resolveVerifiedTier,
} from "@/lib/subscription-tiers";

async function getSubscriptionPayload(customerId: string) {
  // Not activeOnly: a status endpoint should report "canceled" or "past_due" rather than
  // pretending the customer never subscribed.
  const sub = await getCachedSubscription(customerId);
  const status = sub?.status ?? "inactive";
  const hasSubscription = sub?.isActive ?? false;
  const priceId = sub?.priceId ?? null;
  const tier = getTierByPriceId(priceId);
  const allowedKits = hasSubscription ? getKitsAllowedForPriceId(priceId) : 0;
  return {
    hasSubscription,
    status,
    allowedKits,
    tierId: tier?.id ?? null,
    tierName: tier?.name ?? null,
    verifiedTier: hasSubscription ? getVerifiedTierForPriceId(priceId) : null,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = body.session_id as string | undefined;
    const cookieHeader = req.headers.get("cookie");
    const authSession = await getServerSession(authOptions);

    // First time after checkout: exchange session_id for customer, link to user, set cookie
    /*
      Fast path: exchange a just-completed checkout for its customer and link it to the
      user immediately, so the success page does not have to wait for the webhook.

      Only some providers can do this. Stripe returns the customer and subscription from a
      session; Dodo's session exposes payment status alone, so its isCheckoutSessionId
      returns false and this block is skipped entirely. Either way the webhook is the
      authority — this is a latency optimisation, not the source of truth.
    */
    const checkout =
      sessionId && payments.isCheckoutSessionId(sessionId)
        ? await payments.getCheckout(sessionId)
        : null;

    if (checkout?.customerId) {
      const customerId = checkout.customerId;
      const userId = checkout.userId;
      const sub = checkout.subscription;
      const status = sub?.status ?? "inactive";
      const priceId = sub?.priceId ?? null;
      const hasSubscription = sub?.isActive ?? false;
      const tier = getTierByPriceId(priceId);
      const allowedKits = hasSubscription ? getKitsAllowedForPriceId(priceId) : 0;

      if (userId) {
        try {
          await prisma.user.update({
            where: { id: userId },
            data: {
              stripeCustomerId: customerId,
              verifiedTier: hasSubscription ? getVerifiedTierForPriceId(priceId) : null,
            },
          });
        } catch {
          // ignore if user not found or already set
        }
      }

      const res = NextResponse.json({
        hasSubscription,
        status,
        allowedKits,
        tierId: tier?.id ?? null,
        tierName: tier?.name ?? null,
      });
      res.headers.set("Set-Cookie", setSubscriptionCookie(customerId));
      return res;
    }

    /*
      Dodo fast path: its checkout return URL carries `subscription_id=…` (no session to
      exchange). Look the subscription up and link it now instead of waiting for the webhook
      (which can't reach localhost at all, and can lag in production). Only when the
      subscription's metadata names THIS signed-in user, so a pasted id links nothing.
      The webhook stays the source of truth; this just stops the success page showing Free.
    */
    const subscriptionId = typeof body.subscription_id === "string" ? body.subscription_id : undefined;
    if (subscriptionId && authSession?.user?.id && payments.getSubscriptionById) {
      const found = await payments.getSubscriptionById(subscriptionId).catch(() => null);
      if (found && found.userId === authSession.user.id && found.subscription.customerId) {
        const { subscription } = found;
        const me = await prisma.user.findUnique({ where: { id: authSession.user.id }, select: { compedTier: true } });
        await prisma.user
          .update({
            where: { id: authSession.user.id },
            data: {
              stripeCustomerId: subscription.customerId,
              verifiedTier: resolveVerifiedTier(
                subscription.isActive ? getVerifiedTierForPriceId(subscription.priceId) : null,
                me?.compedTier ?? null,
              ),
            },
          })
          .catch((e) => console.error("[subscription-status] linking subscription failed:", e));
        invalidateSubscription(subscription.customerId);
      }
    }

    // Logged-in user: use only this user's stripeCustomerId from DB (do not use cookie — cookie may be from another account)
    if (authSession?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: authSession.user.id },
        select: { stripeCustomerId: true, compedTier: true },
      });
      const customerId = user?.stripeCustomerId ?? null;
      // A comp grants entitlements with no subscription; resolve it once here.
      const compTier = getTierById(user?.compedTier ?? null);
      const compPayload = compTier && {
        hasSubscription: false,
        status: "comped" as const,
        allowedKits: getKitsAllowedForTier(compTier.id),
        tierId: compTier.id,
        tierName: compTier.name,
        verifiedTier: compTier.verifiedTier,
      };

      if (customerId) {
        const payload = await getSubscriptionPayload(customerId);
        // Persisted badge = subscription OR comp, never cleared below the comp.
        await prisma.user.update({
          where: { id: authSession.user.id },
          data: {
            verifiedTier: resolveVerifiedTier(
              payload.hasSubscription ? payload.verifiedTier : null,
              user?.compedTier ?? null
            ),
          },
        }).catch(() => {});
        // Effective plan: an active subscription, else the comp, else free.
        const effective = payload.hasSubscription
          ? payload
          : compPayload ?? {
              hasSubscription: false,
              status: "inactive",
              allowedKits: 1,
              tierId: "free",
              tierName: "Free",
            };
        const res = NextResponse.json(effective);
        if (payload.hasSubscription) {
          res.headers.set("Set-Cookie", setSubscriptionCookie(customerId));
        } else {
          res.headers.set("Set-Cookie", clearSubscriptionCookie());
        }
        return res;
      }

      // No customer: comp if present, else free. Keep the badge in sync with the comp.
      if (compPayload) {
        await prisma.user
          .update({ where: { id: authSession.user.id }, data: { verifiedTier: compPayload.verifiedTier } })
          .catch(() => {});
        const res = NextResponse.json(compPayload);
        res.headers.set("Set-Cookie", clearSubscriptionCookie());
        return res;
      }
      const res = NextResponse.json({ hasSubscription: false, allowedKits: 1, tierId: "free", tierName: "Free" });
      res.headers.set("Set-Cookie", clearSubscriptionCookie());
      return res;
    }

    // No session: fall back to cookie (legacy / pre-auth)
    const customerId = getSubscriptionCustomerId(cookieHeader);
    if (!customerId) {
      return NextResponse.json({ hasSubscription: false });
    }

    const payload = await getSubscriptionPayload(customerId);
    const res = NextResponse.json(payload);
    if (!payload.hasSubscription) {
      res.headers.set("Set-Cookie", clearSubscriptionCookie());
    }
    return res;
  } catch (err: unknown) {
    console.error("Subscription status error:", err);
    return NextResponse.json({ hasSubscription: false }, { status: 500 });
  }
}
