import { NextResponse } from "next/server";
import { payments, WebhookVerificationError } from "@/lib/payments";
import { applyPaymentEvent, type ApplyResult } from "@/lib/payment-events";
import { logDelivery, logRejected, wasDeliveryProcessed } from "@/lib/webhook-log";

/**
 * Payment provider webhook.
 *
 * Provider-agnostic: `payments.parseWebhook` verifies the signature and translates the
 * provider's event into one of our domain events, so this file contains no Stripe types
 * and no signature logic. What each event does lives in `lib/payment-events.ts`, shared
 * with the admin replay.
 *
 * This is the path that grants paid features. If it silently fails, a user pays and
 * receives nothing, so every delivery is logged to `WebhookEvent` (visible on /admin) as
 * well as to the console.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();

  let event;
  try {
    event = await payments.parseWebhook(rawBody, req.headers);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      console.error(`[webhook] ${payments.id} verification failed:`, err.message);
      await logRejected(payments.id, err.message);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook] Failed to parse:", message);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  const deliveryId = payments.webhookDeliveryId(rawBody, req.headers);
  if (await wasDeliveryProcessed(payments.id, deliveryId)) {
    console.log(`[webhook] ${payments.id} delivery ${deliveryId} already applied; acknowledging retry`);
    return NextResponse.json({ received: true, duplicate: true });
  }

  let result: ApplyResult;
  try {
    result = await applyPaymentEvent(event);
  } catch (e) {
    /*
      Answer 200 anyway. The signature was valid, so the provider would retry and replay
      the same event into the same error. Logged as failed instead, replayable from /admin.
    */
    result = { status: "failed", error: e instanceof Error ? e.message : String(e) };
  }

  if (result.status === "failed") {
    console.error(`[webhook] Failed to apply ${event.type}: ${result.error}`);
  } else {
    console.log(`[webhook] ${event.type} ${result.status}${result.note ? `: ${result.note}` : ""}`);
  }
  await logDelivery({
    provider: payments.id,
    deliveryId,
    event,
    status: result.status,
    error: result.status === "failed" ? result.error : null,
  });

  return NextResponse.json({ received: true });
}
