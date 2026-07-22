import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVerifiedTierForPriceId } from "@/config/subscriptions";
import { payments, WebhookVerificationError } from "@/lib/payments";

/**
 * Payment provider webhook.
 *
 * Provider-agnostic: `payments.parseWebhook` verifies the signature and translates the
 * provider's event into one of our domain events, so this file contains no Stripe types
 * and no signature logic.
 *
 * This is the path that grants paid features. If it silently fails, a user pays and
 * receives nothing, so every branch logs.
 */

/** Look up the local user for a provider customer id. */
async function findUserByCustomerId(customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function POST(req: Request) {
  const rawBody = await req.text();

  let event;
  try {
    event = await payments.parseWebhook(rawBody, req.headers);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.error(`[webhook] ${payments.id} verification failed:`, err.message);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook] Failed to parse:", message);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.completed": {
        // The badge tier is derived from the purchased price (creator_pro vs brand_verified).
        const verifiedTier = getVerifiedTierForPriceId(event.priceId);
        if (event.customerId && event.userId) {
          await prisma.user.update({
            where: { id: event.userId },
            data: { stripeCustomerId: event.customerId, verifiedTier },
          });
          console.log(
            `[webhook] Linked customer ${event.customerId} to user ${event.userId}, granted ${verifiedTier ?? "no"} tier`
          );
        } else {
          console.error(
            `[webhook] checkout.completed missing ids (customer=${event.customerId}, user=${event.userId}) — tier not granted`
          );
        }
        break;
      }

      case "subscription.changed": {
        const userId = await findUserByCustomerId(event.customerId);
        if (userId) {
          const tier = event.isActive ? getVerifiedTierForPriceId(event.priceId) : null;
          await prisma.user.update({ where: { id: userId }, data: { verifiedTier: tier } });
          console.log(
            `[webhook] Subscription changed — verifiedTier ${tier ? `set to ${tier}` : "cleared"} for user ${userId}`
          );
        }
        break;
      }

      case "subscription.canceled": {
        const userId = await findUserByCustomerId(event.customerId);
        if (userId) {
          await prisma.user.update({ where: { id: userId }, data: { verifiedTier: null } });
          console.log(`[webhook] Subscription canceled — verifiedTier cleared for user ${userId}`);
        }
        break;
      }

      case "ignored":
        console.log(`[webhook] Unhandled ${payments.id} event: ${event.providerEventType}`);
        break;
    }
  } catch (e) {
    /*
      Answer 200 anyway. The signature was valid, so the provider would retry and replay
      the same event into the same error. Logged loudly instead of looping.
    */
    console.error(`[webhook] Failed to apply ${event.type}:`, e);
  }

  return NextResponse.json({ received: true });
}
