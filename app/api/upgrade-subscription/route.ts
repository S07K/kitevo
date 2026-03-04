import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getSubscriptionCustomerId } from "@/lib/subscription-cookie";
import { getPriceIdForTier, getTierByPriceId } from "@/config/subscriptions";

/**
 * Upgrade (or change) the current subscription to another tier.
 * POST body: { tierId: "pro" }
 * Uses logged-in user's stripeCustomerId or subscription cookie.
 */
export async function POST(req: Request) {
  try {
    const authSession = await getServerSession(authOptions);
    const cookieHeader = req.headers.get("cookie");
    let customerId: string | null = null;
    if (authSession?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: authSession.user.id },
        select: { stripeCustomerId: true },
      });
      customerId = user?.stripeCustomerId ?? getSubscriptionCustomerId(cookieHeader);
    } else {
      customerId = getSubscriptionCustomerId(cookieHeader);
    }
    if (!customerId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const tierId = body.tierId as string | undefined;
    if (!tierId || typeof tierId !== "string") {
      return NextResponse.json({ error: "tierId required" }, { status: 400 });
    }

    const newPriceId = getPriceIdForTier(tierId);
    if (!newPriceId) {
      return NextResponse.json(
        { error: `Price not configured for tier: ${tierId}` },
        { status: 400 }
      );
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const sub = subscriptions.data[0];
    if (!sub) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    const item = sub.items.data[0];
    if (!item) {
      return NextResponse.json(
        { error: "Subscription has no items" },
        { status: 400 }
      );
    }

    const currentTier = getTierByPriceId(item.price.id as string);
    if (currentTier?.id === tierId) {
      return NextResponse.json({
        url: null,
        message: "Already on this plan",
      });
    }

    await stripe.subscriptions.update(sub.id, {
      items: [
        {
          id: item.id,
          price: newPriceId,
        },
      ],
      proration_behavior: "create_prorations",
    });

    return NextResponse.json({
      success: true,
      message: "Subscription updated",
    });
  } catch (err: unknown) {
    console.error("Upgrade subscription error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
