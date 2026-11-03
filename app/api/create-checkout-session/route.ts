import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { payments } from "@/lib/payments";
import { authOptions } from "@/lib/auth";
import { getPriceIdForTier, type BillingInterval } from "@/config/subscriptions";
import { prisma } from "@/lib/prisma";
import { trackEvent } from "@/lib/analytics";
import { TRIAL_TIER, cleanDiscountCode, getTrialEligibility } from "@/lib/trials";

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
    const { tierId, returnTo, billing, trial, code } = body as {
      tierId?: string;
      returnTo?: string;
      billing?: string;
      trial?: boolean;
      code?: string;
    };

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

    // Trials are granted here, never trusted from the client: Pro only, and only for an
    // eligible account (lib/trials.ts — one per account, verified email).
    let trialDays: number | undefined;
    if (trial === true) {
      if (tier !== TRIAL_TIER) {
        return NextResponse.json({ error: "Free trials are only available on Pro." }, { status: 400 });
      }
      const eligibility = await getTrialEligibility(authSession.user.id);
      if (!eligibility.eligible) {
        const message =
          eligibility.reason === "unverified"
            ? "Verify your email to start a free trial."
            : eligibility.reason === "used"
              ? "Free trials are for first-time subscribers, and this account has subscribed before."
              : "A free trial isn't available for this account.";
        return NextResponse.json({ error: message, reason: eligibility.reason }, { status: 403 });
      }
      trialDays = eligibility.days;
    }
    const discountCode = cleanDiscountCode(code);

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    // Where to land after checkout, per entry point.
    const returnBase =
      returnTo === "onboarding" ? "/onboarding" :
      returnTo === "brand" ? "/settings" :
      "/dashboard";
    const cancelBase =
      returnTo === "onboarding" ? "/onboarding" :
      returnTo === "brand" ? "/settings" :
      "/pricing";
    // Only Stripe fills in {CHECKOUT_SESSION_ID}; Dodo appends its own subscription_id instead.
    const successUrl = `${baseUrl}${returnBase}?success=true${payments.checkoutSessionPlaceholder ? "&session_id={CHECKOUT_SESSION_ID}" : ""}`;
    const cancelUrl = `${baseUrl}${cancelBase}?canceled=true`;

    const { url } = await payments.createCheckout({
      priceId,
      userId: authSession.user.id,
      email: authSession.user.email ?? undefined,
      successUrl,
      cancelUrl,
      trialDays,
      discountCode,
    });

    await trackEvent("checkout_started", {
      userId: authSession.user.id,
      props: { tier, interval, trial: !!trialDays, code: !!discountCode },
    });
    return NextResponse.json({ url });
  } catch (err: unknown) {
    console.error("Checkout error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
