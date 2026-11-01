import { prisma } from "@/lib/prisma";
import type { PaymentWebhookEvent } from "@/lib/payments";
import { applyPaymentEvent, type ApplyResult } from "@/lib/payment-events";

/**
 * Webhook delivery log (`WebhookEvent`): makes payment webhooks visible on /admin instead of
 * only in Vercel logs, and lets an admin replay a failed one.
 *
 * Stores our domain event (ids, price ids, amounts), never the provider's raw body, which
 * carries customer emails and addresses. Logging never throws: a broken log must not turn
 * a successful delivery into a 500 that the provider then retries.
 */

export type WebhookStatus = "processed" | "ignored" | "failed" | "rejected";

const MAX_ERROR = 500;
const clip = (s: string) => (s.length > MAX_ERROR ? `${s.slice(0, MAX_ERROR)}…` : s);

/** True when this delivery was already applied, so a provider retry can be acknowledged as-is. */
export async function wasDeliveryProcessed(provider: string, deliveryId: string | null): Promise<boolean> {
  if (!deliveryId) return false;
  try {
    const row = await prisma.webhookEvent.findUnique({
      where: { provider_deliveryId: { provider, deliveryId } },
      select: { status: true },
    });
    return row?.status === "processed" || row?.status === "ignored";
  } catch (e) {
    console.error("[webhook-log] lookup failed:", e);
    return false;
  }
}

/** Record (or update, on a retry) one verified delivery and its outcome. */
export async function logDelivery(p: {
  provider: string;
  deliveryId: string | null;
  event: PaymentWebhookEvent;
  status: Exclude<WebhookStatus, "rejected">;
  error?: string | null;
}): Promise<void> {
  const data = {
    type: p.event.type,
    providerType: p.event.type === "ignored" ? p.event.providerEventType : null,
    status: p.status,
    error: p.error ? clip(p.error) : null,
    // Ignored events are logged for visibility only; there is nothing to replay.
    payload: p.event.type === "ignored" ? null : JSON.stringify(p.event),
  };
  try {
    if (p.deliveryId) {
      await prisma.webhookEvent.upsert({
        where: { provider_deliveryId: { provider: p.provider, deliveryId: p.deliveryId } },
        create: { provider: p.provider, deliveryId: p.deliveryId, ...data },
        update: { ...data, attempts: { increment: 1 } },
      });
    } else {
      await prisma.webhookEvent.create({ data: { provider: p.provider, deliveryId: null, ...data } });
    }
  } catch (e) {
    console.error("[webhook-log] failed to record delivery:", e);
  }
}

/**
 * Signature failures. Anyone can POST to the webhook URL, so these are bucketed into one
 * row per provider per hour (attempts = count) rather than one row each: a flood can't
 * grow the table, but a wrong webhook secret still shows up on /admin within the hour.
 */
export async function logRejected(provider: string, message: string, now = new Date()): Promise<void> {
  const deliveryId = `rejected:${now.toISOString().slice(0, 13)}`;
  try {
    await prisma.webhookEvent.upsert({
      where: { provider_deliveryId: { provider, deliveryId } },
      create: { provider, deliveryId, type: "rejected", status: "rejected", error: clip(message) },
      update: { error: clip(message), attempts: { increment: 1 } },
    });
  } catch (e) {
    console.error("[webhook-log] failed to record rejection:", e);
  }
}

/**
 * Re-apply a logged delivery's stored domain event. Returns null when there is nothing to
 * replay (unknown id, or an ignored/rejected row with no payload).
 *
 * Replays the event *as it was*: replaying an old subscription.changed after a newer one
 * would regress the plan. For plan state, prefer a resync from the provider.
 */
export async function replayWebhookEvent(id: string): Promise<ApplyResult | null> {
  const row = await prisma.webhookEvent.findUnique({ where: { id } });
  if (!row?.payload) return null;

  const event = JSON.parse(row.payload) as PaymentWebhookEvent;
  let result: ApplyResult;
  try {
    result = await applyPaymentEvent(event);
  } catch (e) {
    result = { status: "failed", error: e instanceof Error ? e.message : String(e) };
  }
  await prisma.webhookEvent.update({
    where: { id },
    data: {
      status: result.status,
      error: result.status === "failed" ? clip(result.error) : null,
      attempts: { increment: 1 },
    },
  });
  return result;
}
