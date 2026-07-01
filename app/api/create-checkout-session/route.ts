import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { stripe } from "@/lib/stripe";
import { authOptions } from "@/lib/auth";
import { getPriceIdForTier, type BillingInterval } from "@/config/subscriptions";
import { prisma } from "@/lib/prisma";

async function hasPaidSubscription(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } });
  if (!user?.stripeCustomerId) return false;
  const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "active", limit: 1 });
  return subs.data.length > 0;
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
    const goToOnboarding = returnTo === "onboarding";
    const successUrl = goToOnboarding
      ? `${baseUrl}/onboarding?success=true&session_id={CHECKOUT_SESSION_ID}`
      : `${baseUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = goToOnboarding ? `${baseUrl}/onboarding?canceled=true` : `${baseUrl}/pricing?canceled=true`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: authSession.user.email ?? undefined,
      client_reference_id: authSession.user.id,
      metadata: { userId: authSession.user.id },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Stripe checkout error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
