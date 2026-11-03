import Stripe from "stripe";
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
 * Stripe implementation of `PaymentProvider`.
 *
 * This is the only file in the app that imports the `stripe` package or knows what a
 * `cs_` prefix means. Everything Stripe-shaped is normalised here.
 */

/**
 * Lazily-built Stripe client.
 *
 * `lib/payments/index.ts` imports every provider to select one, so this module loads even
 * when PAYMENT_PROVIDER=dodo. Newer Stripe SDKs throw from the constructor on an empty
 * key, so building the client at import time would crash a Dodo-only deployment that
 * carries no STRIPE_SECRET_KEY. Building on first use means selecting Stripe is the only
 * thing that requires a Stripe key.
 */
let client: Stripe | null = null;
function stripeClient(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is required when PAYMENT_PROVIDER=stripe");
  client = new Stripe(key, { typescript: true });
  return client;
}

/** Stripe's statuses, narrowed to ours. Unknown values fail closed to "inactive". */
function toStatus(status: Stripe.Subscription.Status | string | undefined): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
      return status;
    default:
      return "inactive";
  }
}

function toSnapshot(sub: Stripe.Subscription): SubscriptionSnapshot {
  const item = sub.items?.data?.[0];
  const status = toStatus(sub.status);
  return {
    id: sub.id,
    customerId: typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? ""),
    status,
    priceId: (item?.price?.id as string) ?? null,
    // Trialing grants access too — deriving it here means no caller has to remember that.
    isActive: status === "active" || status === "trialing",
    itemId: item?.id ?? null,
  };
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",

  isCheckoutSessionId(value) {
    return value.startsWith("cs_");
  },

  webhookDeliveryId(rawBody) {
    // Stripe retries resend the same Event, so its evt_ id identifies the delivery.
    try {
      const id = (JSON.parse(rawBody) as { id?: unknown }).id;
      return typeof id === "string" && id ? id : null;
    } catch {
      return null;
    }
  },

  async createCheckout({ priceId, userId, email, successUrl, cancelUrl, trialDays, discountCode }: CreateCheckoutParams) {
    // A pre-filled code must be an active promotion code; Stripe can't take both a discount
    // and the code-entry field, so an unknown code falls back to letting the customer type one.
    let promotionCodeId: string | null = null;
    if (discountCode) {
      try {
        const found = await stripeClient().promotionCodes.list({ code: discountCode, active: true, limit: 1 });
        promotionCodeId = found.data[0]?.id ?? null;
      } catch {
        promotionCodeId = null;
      }
    }
    const session = await stripeClient().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      // Both, deliberately: client_reference_id is the documented field, but metadata
      // survives more event shapes. The webhook reads whichever is present.
      client_reference_id: userId,
      metadata: { userId },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      ...(trialDays ? { subscription_data: { trial_period_days: trialDays }, payment_method_collection: "always" as const } : {}),
      ...(promotionCodeId ? { discounts: [{ promotion_code: promotionCodeId }] } : { allow_promotion_codes: true }),
    });
    return { url: session.url };
  },

  async getCheckout(sessionId): Promise<CheckoutSnapshot | null> {
    const session = await stripeClient().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    if (!session) return null;

    const raw = session.subscription;
    let subscription: SubscriptionSnapshot | null = null;
    if (raw) {
      // `expand` usually returns the object, but fall back to a fetch if it came back as an id.
      const sub = typeof raw === "object" ? raw : await stripeClient().subscriptions.retrieve(raw as string);
      subscription = toSnapshot(sub as Stripe.Subscription);
    }

    return {
      customerId: typeof session.customer === "string" ? session.customer : null,
      userId:
        (session.client_reference_id as string) || (session.metadata?.userId as string) || null,
      subscription,
    };
  },

  // Stripe substitutes {CHECKOUT_SESSION_ID} in the success URL; the session path links the plan.
  checkoutSessionPlaceholder: true,

  async getSubscription(customerId, opts) {
    const subs = await stripeClient().subscriptions.list({
      customer: customerId,
      status: opts?.activeOnly ? "active" : "all",
      limit: 1,
    });
    const sub = subs.data[0];
    return sub ? toSnapshot(sub) : null;
  },

  async changeSubscriptionPrice(subscription, newPriceId) {
    if (!subscription.itemId) {
      throw new Error("Subscription has no line item to update");
    }
    await stripeClient().subscriptions.update(subscription.id, {
      items: [{ id: subscription.itemId, price: newPriceId }],
      proration_behavior: "create_prorations",
    });
  },

  async createBillingPortalUrl(customerId, returnUrl) {
    const session = await stripeClient().billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session.url;
  },

  async parseWebhook(rawBody, headers): Promise<PaymentWebhookEvent> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new WebhookVerificationError("STRIPE_WEBHOOK_SECRET is not set");

    const signature = headers.get("stripe-signature");
    if (!signature) throw new WebhookVerificationError("Missing stripe-signature header");

    let event: Stripe.Event;
    try {
      event = stripeClient().webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      throw new WebhookVerificationError(err instanceof Error ? err.message : "Invalid signature");
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // The price is only on the subscription, so this costs one extra call. Without it
        // the webhook cannot tell a creator plan from a brand plan.
        let priceId: string | null = null;
        if (session.subscription) {
          const sub = await stripeClient().subscriptions.retrieve(session.subscription as string);
          priceId = sub.items?.data?.[0]?.price?.id ?? null;
        }
        return {
          type: "checkout.completed",
          customerId: typeof session.customer === "string" ? session.customer : null,
          userId:
            (session.client_reference_id as string) || (session.metadata?.userId as string) || null,
          priceId,
        };
      }

      case "customer.subscription.updated": {
        const sub = toSnapshot(event.data.object as Stripe.Subscription);
        return {
          type: "subscription.changed",
          customerId: sub.customerId || null,
          priceId: sub.priceId,
          isActive: sub.isActive,
        };
      }

      case "customer.subscription.deleted": {
        const sub = toSnapshot(event.data.object as Stripe.Subscription);
        return {
          type: "subscription.canceled",
          customerId: sub.customerId || null,
          subscriptionId: sub.id,
        };
      }

      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        if (!inv.id || !inv.amount_paid) {
          return { type: "ignored", providerEventType: "invoice.paid (zero amount)" };
        }
        return {
          type: "payment.succeeded",
          paymentId: inv.id,
          customerId: typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? null,
          userId: (inv.metadata?.userId as string) || null,
          amount: Math.min(inv.amount_paid, inv.total_excluding_tax ?? inv.amount_paid),
          currency: inv.currency.toUpperCase(),
        };
      }

      // Refunds are NOT mapped for Stripe yet: since API 2025-03 a Charge no longer links
      // to its invoice, so a refund can't be matched to the invoice-keyed commission
      // without an extra InvoicePayment lookup. Dodo (the live provider) maps refunds.
      // Until then, reverse a Stripe-refunded commission from the admin payouts page.

      default:
        return { type: "ignored", providerEventType: event.type };
    }
  },
};
