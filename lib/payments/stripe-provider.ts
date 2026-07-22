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

const key = process.env.STRIPE_SECRET_KEY;
if (!key && process.env.NODE_ENV === "production") {
  throw new Error("STRIPE_SECRET_KEY is required in production");
}

/** Exported for the tests that still assert on Stripe call shapes. */
export const stripe = new Stripe(key || "", { typescript: true });

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

  async createCheckout({ priceId, userId, email, successUrl, cancelUrl }: CreateCheckoutParams) {
    const session = await stripe.checkout.sessions.create({
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
    });
    return { url: session.url };
  },

  async getCheckout(sessionId): Promise<CheckoutSnapshot | null> {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    if (!session) return null;

    const raw = session.subscription;
    let subscription: SubscriptionSnapshot | null = null;
    if (raw) {
      // `expand` usually returns the object, but fall back to a fetch if it came back as an id.
      const sub = typeof raw === "object" ? raw : await stripe.subscriptions.retrieve(raw as string);
      subscription = toSnapshot(sub as Stripe.Subscription);
    }

    return {
      customerId: typeof session.customer === "string" ? session.customer : null,
      userId:
        (session.client_reference_id as string) || (session.metadata?.userId as string) || null,
      subscription,
    };
  },

  async getSubscription(customerId, opts) {
    const subs = await stripe.subscriptions.list({
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
    await stripe.subscriptions.update(subscription.id, {
      items: [{ id: subscription.itemId, price: newPriceId }],
      proration_behavior: "create_prorations",
    });
  },

  async createBillingPortalUrl(customerId, returnUrl) {
    const session = await stripe.billingPortal.sessions.create({
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
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
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
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
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

      default:
        return { type: "ignored", providerEventType: event.type };
    }
  },
};
