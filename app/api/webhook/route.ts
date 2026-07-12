import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getVerifiedTierForPriceId } from "@/config/subscriptions";
import Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string | null;
      const userId =
        (session.client_reference_id as string) ||
        (session.metadata?.userId as string) ||
        null;

      // Derive the badge tier from the purchased plan's price (creator_pro vs brand_verified).
      let verifiedTier: string | null = null;
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
        verifiedTier = getVerifiedTierForPriceId(priceId);
        console.log(
          `[Webhook] Subscription created: ${subscription.id} for customer ${customerId} (tier ${verifiedTier ?? "none"})`
        );
      }

      if (customerId && userId) {
        try {
          await prisma.user.update({
            where: { id: userId },
            data: { stripeCustomerId: customerId, verifiedTier },
          });
          console.log(`[Webhook] Linked customer ${customerId} to user ${userId}, granted ${verifiedTier ?? "no"} tier`);
        } catch (e) {
          console.error("[Webhook] Failed to set stripeCustomerId:", e);
        }
      }
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const status = subscription.status;
      const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
      const tier = status === "active" ? getVerifiedTierForPriceId(priceId) : null;
      if (subscription.customer) {
        try {
          const user = await prisma.user.findFirst({
            where: { stripeCustomerId: subscription.customer as string },
            select: { id: true },
          });
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: { verifiedTier: tier },
            });
            console.log(`[Webhook] Subscription ${status} — verifiedTier ${tier ? `set to ${tier}` : "cleared"} for user ${user.id}`);
          }
        } catch (e) {
          console.error("[Webhook] Failed to update verifiedTier on subscription update:", e);
        }
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.customer) {
        try {
          const user = await prisma.user.findFirst({
            where: { stripeCustomerId: subscription.customer as string },
            select: { id: true },
          });
          if (user) {
            await prisma.user.update({ where: { id: user.id }, data: { verifiedTier: null } });
            console.log(`[Webhook] Subscription canceled — verifiedTier cleared for user ${user.id}`);
          }
        } catch (e) {
          console.error("[Webhook] Failed to clear verifiedTier on cancellation:", e);
        }
      }
      console.log(`[Webhook] Subscription canceled: ${subscription.id}`);
      break;
    }
    default:
      console.log(`[Webhook] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
