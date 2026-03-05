import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { stripe } from "@/lib/stripe";
import { authOptions } from "@/lib/auth";
import { getPriceIdForTier } from "@/config/subscriptions";
import { getAllowedKitsForUser } from "@/lib/subscription-for-request";

export async function POST(req: Request) {
  try {
    const authSession = await getServerSession(authOptions);
    const body = await req.json().catch(() => ({}));
    const { email, tierId } = body as { email?: string; tierId?: string };

    if (authSession?.user?.id) {
      const allowedKits = await getAllowedKitsForUser(authSession.user.id);
      if (allowedKits > 0) {
        return NextResponse.json(
          { error: "You already have an active subscription. Manage it from your dashboard." },
          { status: 409 }
        );
      }
    }

    const tier = tierId && typeof tierId === "string" ? tierId : "starter";
    const priceId = getPriceIdForTier(tier);

    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe price not configured for tier: ${tier}. Set STRIPE_PRICE_ID_${tier.toUpperCase()} in env.` },
        { status: 500 }
      );
    }

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: authSession?.user?.email ?? email ?? undefined,
      client_reference_id: authSession?.user?.id ?? undefined,
      metadata: authSession?.user?.id ? { userId: authSession.user.id } : undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("Stripe checkout error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
