import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { payments } from "@/lib/payments";
import { authOptions } from "@/lib/auth";
import { getPriceIdForTier, type BillingInterval } from "@/config/subscriptions";
import { prisma } from "@/lib/prisma";

async function hasPaidSubscription(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } });
  if (!user?.stripeCustomerId) return false;
  const sub = await payments.getSubscription(user.stripeCustomerId, { activeOnly: true });
  return sub !== null;
}

export async function POST(req: Request) {
  try {
    const authSession = await getServerSession(authOptions);
    if (!authSession?.user?.id) {
      return NextResponse.json(
        { error: "Sign in to subscribe" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { tierId, returnTo, billing } = body as { tierId?: string; returnTo?: string; billing?: string };

    if (await hasPaidSubscription(authSession.user.id)) {
      return NextResponse.json(
        { error: "You already have an active subscription. Manage it from your dashboard." },
        { status: 409 }
      );
    }

    const tier = tierId && typeof tierId === "string" ? tierId : "starter";
    const interval: BillingInterval = billing === "yearly" ? "yearly" : "monthly";
    const priceId = getPriceIdForTier(tier, interval);

    if (!priceId) {
      const envKey = interval === "yearly"
        ? `STRIPE_PRICE_ID_${tier.toUpperCase()}_YEARLY`
        : `STRIPE_PRICE_ID_${tier.toUpperCase()}`;
      return NextResponse.json(
        { error: `Stripe price not configured for ${tier} (${interval}). Set ${envKey} in env.` },
        { status: 500 }
      );
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    // Where to land after checkout, per entry point.
    const returnBase =
      returnTo === "onboarding" ? "/onboarding" :
      returnTo === "brand" ? "/brand/settings" :
      "/dashboard";
    const cancelBase =
      returnTo === "onboarding" ? "/onboarding" :
      returnTo === "brand" ? "/brand/settings" :
      "/pricing";
    const successUrl = `${baseUrl}${returnBase}?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${baseUrl}${cancelBase}?canceled=true`;

    const { url } = await payments.createCheckout({
      priceId,
      userId: authSession.user.id,
      email: authSession.user.email ?? undefined,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({ url });
  } catch (err: unknown) {
    console.error("Checkout error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
