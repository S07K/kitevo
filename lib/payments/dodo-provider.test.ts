import { describe, it, expect, vi, beforeEach } from "vitest";

const { listSubs, createSession, changePlan, portalCreate, verify } = vi.hoisted(() => ({
  listSubs: vi.fn(),
  createSession: vi.fn(),
  changePlan: vi.fn(),
  portalCreate: vi.fn(),
  verify: vi.fn(),
}));

vi.mock("dodopayments", () => ({
  default: class {
    checkoutSessions = { create: createSession, retrieve: vi.fn() };
    subscriptions = { list: listSubs, changePlan, retrieve: vi.fn() };
    customers = { customerPortal: { create: portalCreate } };
  },
}));

vi.mock("standardwebhooks", () => ({
  Webhook: class {
    verify = verify;
  },
}));

import { dodoProvider } from "./dodo-provider";

// The provider is only reachable when Dodo is the active provider, which always has a key.
// The lazy client throws without one (verified by the stripe-default import test), so
// stub it here rather than in every describe block.
vi.stubEnv("DODO_API_KEY", "dodo_test_key");
import { WebhookVerificationError } from "./types";

/** A Dodo subscription, shaped as the API returns it. */
const sub = (over: Record<string, unknown> = {}) => ({
  subscription_id: "sub_dodo_1",
  product_id: "prod_1",
  status: "active",
  customer: { customer_id: "cus_dodo_1", email: "a@b.com", name: "A" },
  metadata: { kitevo_user_id: "user_1" },
  ...over,
});

const HEADERS = () =>
  new Headers({
    "webhook-id": "msg_1",
    "webhook-signature": "v1,sig",
    "webhook-timestamp": "1700000000",
  });

const body = (type: string, data: Record<string, unknown> = sub()) =>
  JSON.stringify({ type, data });

describe("dodoProvider status normalisation", () => {
  beforeEach(() => {
    vi.stubEnv("DODO_WEBHOOK_SECRET", "whsec_test");
    verify.mockReset().mockReturnValue(undefined);
  });

  // Dodo spells it "cancelled"; Stripe spells it "canceled". Normalising both to one
  // value is the whole point of the boundary.
  it("maps Dodo's 'cancelled' spelling to our canonical 'canceled'", async () => {
    const event = await dodoProvider.parseWebhook(
      body("subscription.updated", sub({ status: "cancelled" })),
      HEADERS()
    );
    expect(event).toMatchObject({ type: "subscription.changed", isActive: false });
  });

  it("maps on_hold to inactive, so a failed payment stops granting features", async () => {
    const event = await dodoProvider.parseWebhook(
      body("subscription.on_hold", sub({ status: "on_hold" })),
      HEADERS()
    );
    expect(event).toMatchObject({ isActive: false });
  });

  it("grants access only on active", async () => {
    const event = await dodoProvider.parseWebhook(body("subscription.updated"), HEADERS());
    expect(event).toMatchObject({ isActive: true });
  });

  // Dodo has no trialing state; anything unrecognised must fail closed.
  it("treats an unknown status as inactive", async () => {
    const event = await dodoProvider.parseWebhook(
      body("subscription.updated", sub({ status: "some_future_status" })),
      HEADERS()
    );
    expect(event).toMatchObject({ isActive: false });
  });
});

describe("dodoProvider.parseWebhook event mapping", () => {
  beforeEach(() => {
    vi.stubEnv("DODO_WEBHOOK_SECRET", "whsec_test");
    verify.mockReset().mockReturnValue(undefined);
  });

  /*
    Dodo has no checkout.completed event. subscription.active is the first point where a
    customer id, a product and our metadata coexist, so it must produce the event that
    links the payment to a user — otherwise a paying customer is never granted anything.
  */
  it("treats subscription.active as the linking event, carrying our user id", async () => {
    const event = await dodoProvider.parseWebhook(body("subscription.active"), HEADERS());
    expect(event).toEqual({
      type: "checkout.completed",
      customerId: "cus_dodo_1",
      userId: "user_1",
      priceId: "prod_1",
    });
  });

  it("treats a renewal as linking too, so a lapsed-then-renewed user is restored", async () => {
    const event = await dodoProvider.parseWebhook(body("subscription.renewed"), HEADERS());
    expect(event).toMatchObject({ type: "checkout.completed", customerId: "cus_dodo_1" });
  });

  it("maps a plan change to subscription.changed with the new product", async () => {
    const event = await dodoProvider.parseWebhook(
      body("subscription.plan_changed", sub({ product_id: "prod_2" })),
      HEADERS()
    );
    expect(event).toMatchObject({ type: "subscription.changed", priceId: "prod_2", isActive: true });
  });

  it.each(["subscription.cancelled", "subscription.expired", "subscription.failed"])(
    "maps %s to canceled",
    async (type) => {
      const event = await dodoProvider.parseWebhook(body(type, sub({ status: "cancelled" })), HEADERS());
      expect(event).toMatchObject({ type: "subscription.canceled", subscriptionId: "sub_dodo_1" });
    }
  );

  it("maps payment.succeeded to a pre-tax amount in the settlement currency", async () => {
    const payment = {
      payment_id: "pay_1",
      total_amount: 1800,
      tax: 300,
      currency: "INR",
      settlement_amount: 1500,
      settlement_tax: 250,
      settlement_currency: "USD",
      is_update_payment_method: false,
      customer: { customer_id: "cus_dodo_1" },
      metadata: { kitevo_user_id: "user_1" },
    };
    expect(await dodoProvider.parseWebhook(body("payment.succeeded", payment), HEADERS())).toEqual({
      type: "payment.succeeded",
      paymentId: "pay_1",
      customerId: "cus_dodo_1",
      userId: "user_1",
      amount: 1250,
      currency: "USD",
    });
  });

  it("ignores zero-amount update-payment-method charges", async () => {
    const ev = await dodoProvider.parseWebhook(
      body("payment.succeeded", { payment_id: "pay_2", total_amount: 0, is_update_payment_method: true }),
      HEADERS()
    );
    expect(ev.type).toBe("ignored");
  });

  it("maps refunds: partial carries the amount, full is null", async () => {
    expect(
      await dodoProvider.parseWebhook(body("refund.succeeded", { refund_id: "rf_1", payment_id: "pay_1", amount: 500, is_partial: true }), HEADERS())
    ).toEqual({ type: "payment.refunded", paymentId: "pay_1", refundId: "rf_1", amount: 500 });
    expect(
      await dodoProvider.parseWebhook(body("refund.succeeded", { refund_id: "rf_2", payment_id: "pay_1", amount: 1800, is_partial: false }), HEADERS())
    ).toEqual({ type: "payment.refunded", paymentId: "pay_1", refundId: "rf_2", amount: null });
  });

  it("reports unrecognised events as ignored rather than dropping them", async () => {
    const event = await dodoProvider.parseWebhook(body("payment.processing"), HEADERS());
    expect(event).toEqual({ type: "ignored", providerEventType: "payment.processing" });
  });

  it("returns a null userId when metadata is absent, rather than inventing one", async () => {
    const event = await dodoProvider.parseWebhook(
      body("subscription.active", sub({ metadata: null })),
      HEADERS()
    );
    expect(event).toMatchObject({ userId: null });
  });
});

describe("dodoProvider webhook security", () => {
  beforeEach(() => {
    vi.stubEnv("DODO_WEBHOOK_SECRET", "whsec_test");
    verify.mockReset().mockReturnValue(undefined);
  });

  it("throws when the signature does not verify", async () => {
    verify.mockImplementation(() => {
      throw new Error("no matching signature");
    });
    await expect(dodoProvider.parseWebhook(body("subscription.active"), HEADERS())).rejects.toBeInstanceOf(
      WebhookVerificationError
    );
  });

  it.each(["webhook-id", "webhook-signature", "webhook-timestamp"])(
    "throws when the %s header is missing",
    async (missing) => {
      const h = HEADERS();
      h.delete(missing);
      await expect(dodoProvider.parseWebhook(body("subscription.active"), h)).rejects.toBeInstanceOf(
        WebhookVerificationError
      );
    }
  );

  it("throws when the webhook secret is not configured", async () => {
    vi.stubEnv("DODO_WEBHOOK_SECRET", "");
    await expect(dodoProvider.parseWebhook(body("subscription.active"), HEADERS())).rejects.toBeInstanceOf(
      WebhookVerificationError
    );
  });

  // The raw body must be verified, not a re-serialised copy: JSON.stringify does not
  // round-trip byte-for-byte and the signature is over the exact bytes sent.
  it("verifies the raw request body", async () => {
    const raw = body("subscription.active");
    await dodoProvider.parseWebhook(raw, HEADERS());
    expect(verify).toHaveBeenCalledWith(raw, expect.objectContaining({ "webhook-id": "msg_1" }));
  });
});

describe("dodoProvider subscriptions", () => {
  beforeEach(() => listSubs.mockReset());

  it("prefers an active subscription over an older cancelled one", async () => {
    listSubs.mockResolvedValue({
      items: [sub({ subscription_id: "old", status: "cancelled" }), sub({ subscription_id: "live" })],
    });
    const snapshot = await dodoProvider.getSubscription("cus_dodo_1");
    expect(snapshot).toMatchObject({ id: "live", isActive: true });
  });

  it("returns null when activeOnly and nothing is active", async () => {
    listSubs.mockResolvedValue({ items: [sub({ status: "cancelled" })] });
    expect(await dodoProvider.getSubscription("cus_dodo_1", { activeOnly: true })).toBeNull();
  });

  it("still reports a cancelled subscription when not activeOnly, for status display", async () => {
    listSubs.mockResolvedValue({ items: [sub({ status: "cancelled" })] });
    expect(await dodoProvider.getSubscription("cus_dodo_1")).toMatchObject({
      status: "canceled",
      isActive: false,
    });
  });

  it("returns null when the customer has no subscriptions", async () => {
    listSubs.mockResolvedValue({ items: [] });
    expect(await dodoProvider.getSubscription("cus_dodo_1")).toBeNull();
  });

  it("filters by customer id rather than scanning every subscription", async () => {
    listSubs.mockResolvedValue({ items: [] });
    await dodoProvider.getSubscription("cus_dodo_9");
    expect(listSubs).toHaveBeenCalledWith(expect.objectContaining({ customer_id: "cus_dodo_9" }));
  });
});

describe("dodoProvider checkout", () => {
  beforeEach(() => createSession.mockReset());

  it("puts our user id in metadata, which is the only way the webhook can identify the buyer", async () => {
    createSession.mockResolvedValue({ session_id: "s1", checkout_url: "https://checkout.dodo/x" });
    const res = await dodoProvider.createCheckout({
      priceId: "prod_1",
      userId: "user_1",
      email: "a@b.com",
      successUrl: "https://getkitevo.com/dashboard?success=true",
      cancelUrl: "https://getkitevo.com/pricing",
    });

    expect(res.url).toBe("https://checkout.dodo/x");
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        product_cart: [{ product_id: "prod_1", quantity: 1 }],
        metadata: { kitevo_user_id: "user_1" },
      })
    );
  });

  const params = { priceId: "prod_1", userId: "user_1", successUrl: "https://x/ok", cancelUrl: "https://x/no" };

  it("always sets the trial length, so a product-level trial in the dashboard can't leak to ineligible buyers", async () => {
    createSession.mockResolvedValue({ checkout_url: "https://checkout.dodo/x" });
    await dodoProvider.createCheckout(params);
    expect(createSession).toHaveBeenLastCalledWith(expect.objectContaining({ subscription_data: { trial_period_days: 0 } }));
    await dodoProvider.createCheckout({ ...params, trialDays: 14 });
    expect(createSession).toHaveBeenLastCalledWith(expect.objectContaining({ subscription_data: { trial_period_days: 14 } }));
  });

  it("pre-applies a discount code, and falls back to a plain checkout if Dodo rejects it", async () => {
    createSession.mockRejectedValueOnce(new Error("invalid discount code")).mockResolvedValueOnce({ checkout_url: "https://checkout.dodo/plain" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await dodoProvider.createCheckout({ ...params, discountCode: "NOPE" });
    expect(res.url).toBe("https://checkout.dodo/plain");
    expect(createSession).toHaveBeenNthCalledWith(1, expect.objectContaining({ discount_codes: ["NOPE"] }));
    expect(createSession.mock.calls[1][0]).not.toHaveProperty("discount_codes");
    warn.mockRestore();
  });

  /*
    Dodo's session retrieve exposes no customer id, so a session cannot be exchanged for
    one. Reporting false keeps the status route on the webhook-populated DB path instead
    of concluding the user is not subscribed.
  */
  it("does not claim to recognise checkout session ids", () => {
    expect(dodoProvider.isCheckoutSessionId("anything")).toBe(false);
  });
});
