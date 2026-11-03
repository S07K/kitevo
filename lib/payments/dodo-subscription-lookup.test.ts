import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * getSubscriptionById lets the checkout success page link a Dodo plan from the
 * `subscription_id` Dodo appends to the return URL. Kept in its own file with a minimal
 * SDK mock (the main dodo-provider test's setup reported handled rejections as failures).
 */
const { retrieveSub } = vi.hoisted(() => ({ retrieveSub: vi.fn() }));
vi.mock("dodopayments", () => ({
  default: class {
    subscriptions = { retrieve: retrieveSub, list: vi.fn() };
    checkoutSessions = {};
    customers = {};
  },
}));
vi.mock("standardwebhooks", () => ({ Webhook: class {} }));

import { dodoProvider } from "./dodo-provider";
vi.stubEnv("DODO_API_KEY", "dodo_test_key");

describe("dodoProvider.getSubscriptionById", () => {
  // Braces matter: a beforeEach that returns a function (mockReset returns the mock) is run
  // by vitest as teardown after each test, which would call the mock.
  beforeEach(() => {
    retrieveSub.mockReset();
  });

  it("returns the snapshot and the user id from checkout metadata", async () => {
    retrieveSub.mockResolvedValue({ subscription_id: "sub_abc123", product_id: "prod_pro", status: "active", customer: { customer_id: "cus_9" }, metadata: { kitevo_user_id: "user_1" } });
    expect(await dodoProvider.getSubscriptionById!("sub_abc123")).toEqual({
      subscription: expect.objectContaining({ id: "sub_abc123", customerId: "cus_9", priceId: "prod_pro", isActive: true }),
      userId: "user_1",
    });
  });

  it("skips anything that isn't a subscription id", async () => {
    expect(await dodoProvider.getSubscriptionById!("{CHECKOUT_SESSION_ID}")).toBeNull();
    expect(retrieveSub).not.toHaveBeenCalled();
  });

  it("returns null when the lookup fails", async () => {
    // Thrown synchronously: the SDK call fails before any response; the provider's try/catch
    // covers this the same way as a rejected request.
    retrieveSub.mockImplementation(() => {
      throw new Error("404");
    });
    expect(await dodoProvider.getSubscriptionById!("sub_missing1")).toBeNull();
  });

  it("does not use the Stripe session placeholder", () => {
    expect(dodoProvider.checkoutSessionPlaceholder).toBeFalsy();
  });
});
