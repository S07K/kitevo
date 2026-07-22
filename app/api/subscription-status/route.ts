import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { payments } from "@/lib/payments";
import {
  setSubscriptionCookie,
  getSubscriptionCustomerId,
  clearSubscriptionCookie,
} from "@/lib/subscription-cookie";
import { getKitsAllowedForPriceId, getTierByPriceId, getVerifiedTierForPriceId } from "@/lib/subscription-tiers";

async function getSubscriptionPayload(customerId: string) {
  // Not activeOnly: a status endpoint should report "canceled" or "past_due" rather than
  // pretending the customer never subscribed.
  const sub = await payments.getSubscription(customerId);
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
    if (sessionId && payments.isCheckoutSessionId(sessionId)) {
      const checkout = await payments.getCheckout(sessionId);
      const customerId = checkout?.customerId ?? null;
      if (!customerId) {
        return NextResponse.json({ hasSubscription: false });
      }

      const userId = checkout?.userId ?? null;
      const sub = checkout?.subscription ?? null;
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

    // Logged-in user: use only this user's stripeCustomerId from DB (do not use cookie — cookie may be from another account)
    if (authSession?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: authSession.user.id },
        select: { stripeCustomerId: true },
      });
      const customerId = user?.stripeCustomerId ?? null;
      if (customerId) {
        const payload = await getSubscriptionPayload(customerId);
        // Sync verifiedTier with active subscription state (creator_pro / brand_verified / null)
        await prisma.user.update({
          where: { id: authSession.user.id },
          data: { verifiedTier: payload.hasSubscription ? payload.verifiedTier : null },
        }).catch(() => {});
        // Fall back to free tier if no active paid subscription
        const effective = payload.hasSubscription ? payload : {
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
      // No Stripe customer — free tier by default
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
