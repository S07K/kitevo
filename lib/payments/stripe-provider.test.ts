import { describe, it, expect, vi, beforeEach } from "vitest";

const { constructEvent, retrieveSub, listSubs, createSession } = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  retrieveSub: vi.fn(),
  listSubs: vi.fn(),
  createSession: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    webhooks = { constructEvent };
    subscriptions = { retrieve: retrieveSub, list: listSubs, update: vi.fn() };
    checkout = { sessions: { create: createSession, retrieve: vi.fn() } };
    billingPortal = { sessions: { create: vi.fn() } };
  },
}));

import { stripeProvider } from "./stripe-provider";
import { WebhookVerificationError } from "./types";

/** A minimal Stripe subscription, shaped as the SDK returns it. */
const sub = (over: Record<string, unknown> = {}) => ({
  id: "sub_1",
  customer: "cus_1",
  status: "active",
  items: { data: [{ id: "si_1", price: { id: "price_1" } }] },
  ...over,
});

const headers = (h: Record<string, string> = { "stripe-signature": "sig" }) => new Headers(h);

describe("stripeProvider.parseWebhook", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
    constructEvent.mockReset();
    retrieveSub.mockReset();
  });

  it("maps checkout.session.completed, resolving the price from the subscription", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { customer: "cus_1", client_reference_id: "user_1", subscription: "sub_1" } },
    });
    retrieveSub.mockResolvedValue(sub());

    const event = await stripeProvider.parseWebhook("{}", headers());
    expect(event).toEqual({
      type: "checkout.completed",
      customerId: "cus_1",
      userId: "user_1",
      priceId: "price_1",
    });
  });

  it("falls back to metadata.userId when client_reference_id is absent", async () => {
    constructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { customer: "cus_1", metadata: { userId: "user_2" }, subscription: null } },
    });

    const event = await stripeProvider.parseWebhook("{}", headers());
    expect(event).toMatchObject({ type: "checkout.completed", userId: "user_2" });
  });

  it("maps an active subscription update to isActive", async () => {
    constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: sub() },
    });
    expect(await stripeProvider.parseWebhook("{}", headers())).toEqual({
      type: "subscription.changed",
      customerId: "cus_1",
      priceId: "price_1",
      isActive: true,
    });
  });

  // past_due must not keep granting paid features.
  it("maps a past_due subscription to inactive", async () => {
    constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: sub({ status: "past_due" }) },
    });
    expect(await stripeProvider.parseWebhook("{}", headers())).toMatchObject({ isActive: false });
  });

  it("treats trialing as active", async () => {
    constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: sub({ status: "trialing" }) },
    });
    expect(await stripeProvider.parseWebhook("{}", headers())).toMatchObject({ isActive: true });
  });

  // An unrecognised status must fail closed, never grant access.
  it("treats an unknown status as inactive", async () => {
    constructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: sub({ status: "some_future_status" }) },
    });
    expect(await stripeProvider.parseWebhook("{}", headers())).toMatchObject({ isActive: false });
  });

  it("maps subscription deletion to canceled", async () => {
    constructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: sub({ status: "canceled" }) },
    });
    expect(await stripeProvider.parseWebhook("{}", headers())).toEqual({
      type: "subscription.canceled",
      customerId: "cus_1",
      subscriptionId: "sub_1",
    });
  });

  it("reports unrecognised events as ignored rather than dropping them", async () => {
    constructEvent.mockReturnValue({ type: "customer.created", data: { object: {} } });
    expect(await stripeProvider.parseWebhook("{}", headers())).toEqual({
      type: "ignored",
      providerEventType: "customer.created",
    });
  });

  it("maps invoice.paid to payment.succeeded with the pre-tax amount (referral commissions)", async () => {
    constructEvent.mockReturnValue({
      type: "invoice.paid",
      data: { object: { id: "in_1", amount_paid: 1800, total_excluding_tax: 1500, currency: "usd", customer: "cus_1", metadata: {} } },
    });
    expect(await stripeProvider.parseWebhook("{}", headers())).toEqual({
      type: "payment.succeeded",
      paymentId: "in_1",
      customerId: "cus_1",
      userId: null,
      amount: 1500,
      currency: "USD",
    });
  });

  // The security boundary: an unsigned or badly signed body must never reach the handler.
  it("throws WebhookVerificationError on a bad signature", async () => {
    constructEvent.mockImplementation(() => {
      throw new Error("no signatures found matching the expected signature");
    });
    await expect(stripeProvider.parseWebhook("{}", headers())).rejects.toBeInstanceOf(
      WebhookVerificationError
    );
  });

  it("throws when the signature header is missing", async () => {
    await expect(stripeProvider.parseWebhook("{}", headers({}))).rejects.toBeInstanceOf(
      WebhookVerificationError
    );
  });

  it("throws when the webhook secret is not configured", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    await expect(stripeProvider.parseWebhook("{}", headers())).rejects.toBeInstanceOf(
      WebhookVerificationError
    );
  });
});

describe("stripeProvider.getSubscription", () => {
  beforeEach(() => listSubs.mockReset());

  it("requests only active subscriptions when activeOnly is set", async () => {
    listSubs.mockResolvedValue({ data: [sub()] });
    await stripeProvider.getSubscription("cus_1", { activeOnly: true });
    expect(listSubs).toHaveBeenCalledWith(expect.objectContaining({ status: "active" }));
  });

  it("requests all subscriptions otherwise, so a status page can show canceled", async () => {
    listSubs.mockResolvedValue({ data: [sub({ status: "canceled" })] });
    const snapshot = await stripeProvider.getSubscription("cus_1");
    expect(listSubs).toHaveBeenCalledWith(expect.objectContaining({ status: "all" }));
    expect(snapshot).toMatchObject({ status: "canceled", isActive: false });
  });

  it("returns null when the customer has no subscriptions", async () => {
    listSubs.mockResolvedValue({ data: [] });
    expect(await stripeProvider.getSubscription("cus_1")).toBeNull();
  });
});

describe("stripeProvider.isCheckoutSessionId", () => {
  it("recognises Stripe checkout session ids", () => {
    expect(stripeProvider.isCheckoutSessionId("cs_test_123")).toBe(true);
    expect(stripeProvider.isCheckoutSessionId("sub_123")).toBe(false);
  });
});
