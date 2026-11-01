/**
 * Provider-agnostic payment contract.
 *
 * Every payment call in the app goes through `PaymentProvider` so that swapping providers
 * means writing one new implementation rather than editing every route. Stripe types must
 * not leak past this boundary: if a route needs to know what `cs_` means or what shape
 * `subscription.items.data[0]` has, the abstraction has failed.
 *
 * The shapes below are deliberately the smallest set the app actually uses, not a mirror
 * of any provider's API.
 */

/**
 * Normalised subscription status. Providers each spell these differently; implementations
 * map into this set and anything unrecognised becomes "inactive", which is the safe
 * default because entitlements are granted only on `isActive`.
 */
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "inactive";

export interface SubscriptionSnapshot {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  /**
   * The provider's price/plan identifier. The app maps this to a tier via
   * `config/subscriptions.ts`, so it stays an opaque string here.
   */
  priceId: string | null;
  /**
   * Whether this subscription should grant paid features. Derived, so callers never have
   * to remember that "trialing" also counts.
   */
  isActive: boolean;
  /**
   * The line item to modify when changing plan. Stripe needs it; other providers may not,
   * hence nullable. Only `changeSubscriptionPrice` should care.
   */
  itemId: string | null;
}

/** The result of a completed hosted-checkout session. */
export interface CheckoutSnapshot {
  customerId: string | null;
  /** Our own user id, round-tripped through checkout metadata. */
  userId: string | null;
  subscription: SubscriptionSnapshot | null;
}

export interface CreateCheckoutParams {
  priceId: string;
  /** Round-tripped so the webhook and the success page can identify the buyer. */
  userId: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Domain events, not provider events.
 *
 * The webhook route switches on these, so adding a provider means mapping its event names
 * here rather than teaching the route a second vocabulary. `ignored` is explicit so
 * unhandled events are logged rather than silently dropped.
 */
export type PaymentWebhookEvent =
  | {
      type: "checkout.completed";
      customerId: string | null;
      userId: string | null;
      priceId: string | null;
    }
  | {
      type: "subscription.changed";
      customerId: string | null;
      priceId: string | null;
      isActive: boolean;
    }
  | { type: "subscription.canceled"; customerId: string | null; subscriptionId: string | null }
  /**
   * Money actually collected (first charge or a renewal). Feeds referral commissions.
   * amount is PRE-TAX, in minor units of `currency` — the provider's settlement currency
   * where it has one, so every commission is in the currency Kitevo is paid in.
   */
  | {
      type: "payment.succeeded";
      paymentId: string;
      customerId: string | null;
      userId: string | null;
      amount: number;
      currency: string;
    }
  /** A refund of a previously succeeded payment. amount null = unknown (treat as full). */
  | { type: "payment.refunded"; paymentId: string; refundId: string; amount: number | null }
  | { type: "ignored"; providerEventType: string };

/** Thrown when a webhook fails signature verification. The route answers 400, never 500. */
export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

export interface PaymentProvider {
  /** For logs and error messages. */
  readonly id: string;

  /**
   * Whether a string looks like this provider's checkout-session id. Exists because
   * routes previously hardcoded `startsWith("cs_")`, which is a Stripe detail.
   */
  isCheckoutSessionId(value: string): boolean;

  createCheckout(params: CreateCheckoutParams): Promise<{ url: string | null }>;

  /** Look up a finished checkout, to link the customer to a user after redirect. */
  getCheckout(sessionId: string): Promise<CheckoutSnapshot | null>;

  /**
   * The customer's most relevant subscription, or null.
   * `activeOnly: true` restricts to subscriptions that currently grant access;
   * `false` returns the latest whatever its state, which is what a status page wants.
   */
  getSubscription(
    customerId: string,
    opts?: { activeOnly?: boolean }
  ): Promise<SubscriptionSnapshot | null>;

  /** Move an existing subscription to a different price, prorating where supported. */
  changeSubscriptionPrice(subscription: SubscriptionSnapshot, newPriceId: string): Promise<void>;

  /**
   * Hosted page where a customer manages or cancels their plan. A provider without one
   * should throw, so the caller surfaces a clear error rather than a blank redirect.
   */
  createBillingPortalUrl(customerId: string, returnUrl: string): Promise<string>;

  /** Verify and translate an incoming webhook. Throws `WebhookVerificationError`. */
  parseWebhook(rawBody: string, headers: Headers): Promise<PaymentWebhookEvent>;
}
