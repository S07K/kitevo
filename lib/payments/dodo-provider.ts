import DodoPayments from "dodopayments";
import { Webhook } from "standardwebhooks";
import type {
  CheckoutSnapshot,
  CreateCheckoutParams,
  PaymentProvider,
  PaymentWebhookEvent,
  SubscriptionSnapshot,
  SubscriptionStatus,
} from "./types";
import { WebhookVerificationError } from "./types";

/**
 * Dodo Payments implementation of `PaymentProvider`.
 *
 * Dodo is a Merchant of Record: it bills the customer, handles global sales tax, and pays
 * out. That is the reason to prefer it over Stripe here — an Indian founder can sell
 * worldwide without registering for tax in each jurisdiction.
 *
 * Two differences from Stripe shape the code below:
 *
 * 1. Dodo has no `trialing` status and spells cancellation `cancelled` (two Ls). Both are
 *    normalised in `toStatus`.
 * 2. Retrieving a checkout session returns only payment status — no customer id and no
 *    subscription id. So a completed checkout cannot be exchanged for a customer the way
 *    Stripe's can, and linking a payment to a user must come from the webhook, which does
 *    carry both. `getCheckout` is honest about this and returns nulls; see the note on
 *    that method.
 *
 * What Stripe calls a price, Dodo calls a product. `SubscriptionSnapshot.priceId` holds a
 * Dodo `product_id` here, which is fine because the app only ever compares it to the ids
 * in `config/subscriptions.ts` (see `DODO_PRODUCT_ID_*`).
 */

/**
 * Lazily-built Dodo client.
 *
 * `lib/payments/index.ts` imports every provider so it can select one, so this module
 * loads even when PAYMENT_PROVIDER=stripe. Constructing the SDK client at import time
 * would then build a Dodo client (and, depending on SDK version, demand a key) for users
 * who never touch Dodo. Building it on first use instead means importing this file costs
 * nothing and the key is only required when Dodo is actually the active provider.
 */
let client: DodoPayments | null = null;
function dodoClient(): DodoPayments {
  if (client) return client;
  const apiKey = process.env.DODO_API_KEY;
  if (!apiKey) throw new Error("DODO_API_KEY is required when PAYMENT_PROVIDER=dodo");
  client = new DodoPayments({
    bearerToken: apiKey,
    // Dodo runs a separate test environment; default to it so a missing or wrong setting
    // can never take a real payment by accident.
    environment: process.env.DODO_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
  });
  return client;
}

/** Our own user id, round-tripped through Dodo metadata so the webhook can identify a buyer. */
const USER_ID_KEY = "kitevo_user_id";

/**
 * Dodo statuses: 'pending' | 'active' | 'on_hold' | 'cancelled' | 'failed' | 'expired'.
 * Anything unrecognised becomes "inactive", which fails closed because entitlements are
 * granted only on `isActive`.
 */
function toStatus(status: string | undefined): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    // Payment failed but the subscription has not ended; equivalent to Stripe's past_due.
    case "on_hold":
      return "past_due";
    case "cancelled":
      return "canceled";
    case "pending":
      return "incomplete";
    case "failed":
    case "expired":
    default:
      return "inactive";
  }
}

/** The subscription fields we depend on, kept loose because only these are contractual here. */
interface DodoSubscriptionLike {
  subscription_id?: string;
  product_id?: string;
  status?: string;
  customer?: { customer_id?: string } | null;
  metadata?: Record<string, string> | null;
}

function toSnapshot(sub: DodoSubscriptionLike): SubscriptionSnapshot {
  const status = toStatus(sub.status);
  return {
    id: sub.subscription_id ?? "",
    customerId: sub.customer?.customer_id ?? "",
    status,
    priceId: sub.product_id ?? null,
    // No trialing concept in Dodo, so active is the only state that grants access.
    isActive: status === "active",
    // Dodo changes plan by subscription id alone; there is no line item to address.
    itemId: null,
  };
}

export const dodoProvider: PaymentProvider = {
  id: "dodo",

  isCheckoutSessionId(value) {
    // Dodo does not publish a stable prefix for session ids, and unlike Stripe a session
    // cannot be exchanged for a customer anyway (see getCheckout). Returning false keeps
    // callers on the webhook-populated database path, which is the reliable one.
    return false;
  },

  async createCheckout({ priceId, userId, email, successUrl }: CreateCheckoutParams) {
    const session = await dodoClient().checkoutSessions.create({
      product_cart: [{ product_id: priceId, quantity: 1 }],
      customer: email ? { email, name: email } : undefined,
      // Surfaces on the Subscription object, so the webhook can map back to our user.
      metadata: { [USER_ID_KEY]: userId },
      return_url: successUrl,
    });
    return { url: session.checkout_url ?? null };
  },

  /**
   * Dodo's checkout retrieve exposes payment status only — no customer id, no
   * subscription id — so there is nothing here to link a payment to a user with.
   * Returning nulls (rather than throwing) lets the status route fall through to the
   * database, which the webhook populates. `isCheckoutSessionId` returns false so this is
   * not normally reached.
   */
  async getCheckout(sessionId): Promise<CheckoutSnapshot | null> {
    const session = await dodoClient().checkoutSessions.retrieve(sessionId);
    if (!session) return null;
    return { customerId: null, userId: null, subscription: null };
  },

  async getSubscription(customerId, opts) {
    const page = await dodoClient().subscriptions.list({ customer_id: customerId, page_size: 10 });
    const items = (page.items ?? []) as DodoSubscriptionLike[];
    const snapshots = items.map(toSnapshot);
    if (opts?.activeOnly) return snapshots.find((s) => s.isActive) ?? null;
    // No status filter on the list endpoint, so prefer an active subscription and fall
    // back to the most recent one, matching how the Stripe provider behaves.
    return snapshots.find((s) => s.isActive) ?? snapshots[0] ?? null;
  },

  async changeSubscriptionPrice(subscription, newPriceId) {
    await dodoClient().subscriptions.changePlan(subscription.id, {
      product_id: newPriceId,
      quantity: 1,
      // Charge the difference immediately, matching the Stripe provider's
      // create_prorations. Dodo's alternatives defer or skip the adjustment.
      proration_billing_mode: "prorated_immediately",
    });
  },

  async createBillingPortalUrl(customerId, returnUrl) {
    const session = await dodoClient().customers.customerPortal.create(customerId, {
      send_email: false,
    });
    if (!session.link) {
      throw new Error("Dodo did not return a customer portal link");
    }
    // Dodo's portal has no return-url parameter, so returnUrl is unused. Accepted rather
    // than dropped from the interface because Stripe needs it.
    void returnUrl;
    return session.link;
  },

  async parseWebhook(rawBody, headers): Promise<PaymentWebhookEvent> {
    const secret = process.env.DODO_WEBHOOK_SECRET;
    if (!secret) throw new WebhookVerificationError("DODO_WEBHOOK_SECRET is not set");

    // Standard Webhooks spec: id + timestamp + body, signed with the secret.
    const id = headers.get("webhook-id");
    const signature = headers.get("webhook-signature");
    const timestamp = headers.get("webhook-timestamp");
    if (!id || !signature || !timestamp) {
      throw new WebhookVerificationError("Missing webhook-id, webhook-signature or webhook-timestamp");
    }

    let payload: { type?: string; data?: DodoSubscriptionLike };
    try {
      new Webhook(secret).verify(rawBody, {
        "webhook-id": id,
        "webhook-signature": signature,
        "webhook-timestamp": timestamp,
      });
      payload = JSON.parse(rawBody);
    } catch (err) {
      throw new WebhookVerificationError(err instanceof Error ? err.message : "Invalid signature");
    }

    const data = payload.data ?? {};
    const snapshot = toSnapshot(data);
    const userId = data.metadata?.[USER_ID_KEY] ?? null;

    switch (payload.type) {
      /*
        Dodo has no distinct "checkout completed" event. subscription.active is the first
        point at which a customer id, a product and our metadata all exist together, so it
        plays the role Stripe's checkout.session.completed does: it is what links the
        payment to a user.
      */
      case "subscription.active":
      case "subscription.renewed":
        return {
          type: "checkout.completed",
          customerId: snapshot.customerId || null,
          userId,
          priceId: snapshot.priceId,
        };

      case "subscription.plan_changed":
      case "subscription.updated":
      case "subscription.on_hold":
      case "subscription.paused":
        return {
          type: "subscription.changed",
          customerId: snapshot.customerId || null,
          priceId: snapshot.priceId,
          isActive: snapshot.isActive,
        };

      case "subscription.cancelled":
      case "subscription.expired":
      case "subscription.failed":
        return {
          type: "subscription.canceled",
          customerId: snapshot.customerId || null,
          subscriptionId: snapshot.id || null,
        };

      default:
        return { type: "ignored", providerEventType: payload.type ?? "unknown" };
    }
  },
};
