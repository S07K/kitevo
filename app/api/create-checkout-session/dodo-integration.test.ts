/**
 * Integration test for the checkout flow with PAYMENT_PROVIDER=dodo.
 *
 * Unlike the unit test next to it (which mocks @/lib/payments), this exercises the real
 * wiring: the route imports the real lib/payments, which selects the real dodoProvider,
 * which calls the Dodo SDK. Only the SDK's network boundary is mocked. So this proves the
 * switch actually routes through Dodo and produces a checkout URL — the thing a live test
 * would confirm, minus real money.
 *
 * It does NOT need Dodo credentials: the SDK is stubbed, so nothing hits Dodo's servers.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Select Dodo before anything imports lib/payments (index.ts reads this at module load).
vi.stubEnv("PAYMENT_PROVIDER", "dodo");
vi.stubEnv("DODO_API_KEY", "dodo_test_key");
vi.stubEnv("DODO_PRODUCT_ID_STARTER", "prod_starter_123");

const { createSession } = vi.hoisted(() => ({ createSession: vi.fn() }));

// Mock only the SDK's network boundary; everything above it is the real code path.
vi.mock("dodopayments", () => ({
  default: class {
    checkoutSessions = { create: createSession, retrieve: vi.fn() };
    subscriptions = { list: vi.fn().mockResolvedValue({ items: [] }), changePlan: vi.fn(), retrieve: vi.fn() };
    customers = { customerPortal: { create: vi.fn() } };
  },
}));

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }));

// Real config, so DODO_PRODUCT_ID_STARTER is resolved via the PAYMENT_PROVIDER prefix.
const { POST } = await import("./route");
const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");

describe("checkout with PAYMENT_PROVIDER=dodo", () => {
  beforeEach(() => {
    createSession.mockReset().mockResolvedValue({
      session_id: "cks_1",
      checkout_url: "https://checkout.dodopayments.com/session/cks_1",
    });
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user_42", email: "creator@example.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ stripeCustomerId: null } as never);
  });

  it("routes through the Dodo provider and returns its checkout URL", async () => {
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ tierId: "starter" }) })
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.dodopayments.com/session/cks_1");
  });

  it("resolves the DODO_PRODUCT_ID_* env (product, not a Stripe price) for the tier", async () => {
    await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ tierId: "starter" }) })
    );

    // The route asked config for the price id; config picked the DODO_ prefix because
    // PAYMENT_PROVIDER=dodo, and the provider put it in product_cart.
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        product_cart: [{ product_id: "prod_starter_123", quantity: 1 }],
      })
    );
  });

  it("passes the user id in metadata, which is how the Dodo webhook links the payment", async () => {
    await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ tierId: "starter" }) })
    );

    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { kitevo_user_id: "user_42" } })
    );
  });

  it("returns 500 with a clear message when the tier's product id is not configured", async () => {
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ tierId: "pro" }) })
    );
    // DODO_PRODUCT_ID_PRO was never stubbed, so config returns null and the route stops
    // before calling Dodo.
    expect(res.status).toBe(500);
    expect(createSession).not.toHaveBeenCalled();
  });
});
