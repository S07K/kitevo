import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  setSubscriptionCookie,
  getSubscriptionCustomerId,
  clearSubscriptionCookie,
} from "@/lib/subscription-cookie";
import { getKitsAllowedForPriceId, getTierByPriceId } from "@/lib/subscription-tiers";

async function getSubscriptionPayload(customerId: string) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 1,
  });
  const sub = subscriptions.data[0];
  const status = sub?.status ?? "inactive";
  const hasSubscription = status === "active" || status === "trialing";
  const item = sub?.items?.data?.[0];
  const priceId = (item?.price?.id as string) ?? null;
  const tier = getTierByPriceId(priceId);
  const allowedKits = hasSubscription ? getKitsAllowedForPriceId(priceId) : 0;
  return {
    hasSubscription,
    status,
    allowedKits,
    tierId: tier?.id ?? null,
    tierName: tier?.name ?? null,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = body.session_id as string | undefined;
    const cookieHeader = req.headers.get("cookie");
    const authSession = await getServerSession(authOptions);

    // First time after checkout: exchange session_id for customer, link to user, set cookie
    if (sessionId && sessionId.startsWith("cs_")) {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });
      const customerId = session.customer as string | null;
      if (!customerId || typeof customerId !== "string") {
        return NextResponse.json({ hasSubscription: false });
      }

      const userId =
        (session.client_reference_id as string) || (session.metadata?.userId as string) || null;
      if (userId) {
        try {
          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: customerId },
          });
        } catch {
          // ignore if user not found or already set
        }
      }

      const subscription = session.subscription;
      let status = "inactive";
      let priceId: string | null = null;
      if (subscription) {
        const sub =
          typeof subscription === "object"
            ? subscription
            : await stripe.subscriptions.retrieve(subscription as string);
        status = sub.status;
        const item = sub.items?.data?.[0];
        priceId = (item?.price?.id as string) ?? null;
      }
      const hasSubscription = status === "active" || status === "trialing";
      const tier = getTierByPriceId(priceId);
      const allowedKits = hasSubscription ? getKitsAllowedForPriceId(priceId) : 0;

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
