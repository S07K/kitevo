import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTierByPriceId, getVerifiedTierForPriceId, resolveVerifiedTier } from "@/config/subscriptions";
import { payments, WebhookVerificationError } from "@/lib/payments";
import { trackEvent } from "@/lib/analytics";

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

/** Look up the local user (id + comp) for a provider customer id. */
async function findUserByCustomerId(
  customerId: string | null
): Promise<{ id: string; compedTier: string | null } | null> {
  if (!customerId) return null;
  return prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true, compedTier: true },
  });
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
        if (event.customerId && event.userId) {
          // Badge from the purchased price, but a comp is the floor: a paying comped user
          // never loses their badge if the price somehow maps to none.
          const existing = await prisma.user.findUnique({
            where: { id: event.userId },
            select: { compedTier: true },
          });
          const verifiedTier = resolveVerifiedTier(
            getVerifiedTierForPriceId(event.priceId),
            existing?.compedTier ?? null
          );
          await prisma.user.update({
            where: { id: event.userId },
            data: { stripeCustomerId: event.customerId, verifiedTier },
          });
          // Dodo reports every renewal as checkout.completed too, so dedupe per user+price:
          // the funnel counts the first upgrade to each plan, not each billing cycle.
          await trackEvent("upgrade", {
            userId: event.userId,
            props: { tier: getTierByPriceId(event.priceId)?.id ?? null },
            dedupeKey: `upgrade:${event.userId}:${event.priceId ?? "unknown"}`,
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
        const user = await findUserByCustomerId(event.customerId);
        if (user) {
          // Comp survives a subscription going inactive: resolve to comp, not null.
          const tier = resolveVerifiedTier(
            event.isActive ? getVerifiedTierForPriceId(event.priceId) : null,
            user.compedTier
          );
          await prisma.user.update({ where: { id: user.id }, data: { verifiedTier: tier } });
          console.log(
            `[webhook] Subscription changed — verifiedTier ${tier ? `set to ${tier}` : "cleared"} for user ${user.id}`
          );
        }
        break;
      }

      case "subscription.canceled": {
        const user = await findUserByCustomerId(event.customerId);
        if (user) {
          // Fall back to the comp if there is one, rather than clearing outright.
          const tier = resolveVerifiedTier(null, user.compedTier);
          await prisma.user.update({ where: { id: user.id }, data: { verifiedTier: tier } });
          await trackEvent("subscription_canceled", { userId: user.id });
          console.log(
            `[webhook] Subscription canceled — verifiedTier ${tier ? `kept at comp ${tier}` : "cleared"} for user ${user.id}`
          );
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
