import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// The route decides "already subscribed" via prisma (stripeCustomerId) + the provider.
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

/*
  Mocks the provider interface rather than Stripe's SDK shape. Before the payments
  abstraction this had to stub `stripe.checkout.sessions.create` and
  `stripe.subscriptions.list` — nested objects that would all change with the provider,
  even though the route's behaviour would not.
*/
vi.mock("@/lib/payments", () => ({
  payments: {
    id: "test",
    getSubscription: vi.fn().mockResolvedValue(null),
    createCheckout: vi.fn().mockResolvedValue({ url: "https://checkout.example/fake" }),
  },
}));

vi.mock("@/config/subscriptions", () => ({
  getPriceIdForTier: vi.fn((tier: string) => (tier === "starter" || tier === "pro" ? "price_fake" : null)),
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { payments } = await import("@/lib/payments");

describe("POST /api/create-checkout-session", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(payments.getSubscription).mockResolvedValue(null);
  });

  it("returns 409 when logged-in user already has an active subscription", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "subscribed@example.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ stripeCustomerId: "cus_1" } as never);
    vi.mocked(payments.getSubscription).mockResolvedValue({
      id: "sub_1",
      customerId: "cus_1",
      status: "active",
      priceId: "price_fake",
      isActive: true,
      itemId: "si_1",
    });

    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ tierId: "starter" }),
      })
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe(
      "You already have an active subscription. Manage it from your dashboard."
    );
  });

  it("allows checkout when logged in but not subscribed", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ stripeCustomerId: null } as never);

    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ tierId: "starter" }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.example/fake");
  });

  it("passes the user id to checkout, so the webhook can identify the buyer", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ stripeCustomerId: null } as never);

    await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ tierId: "starter" }) })
    );

    expect(payments.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", priceId: "price_fake" })
    );
  });

  it("returns 401 when not logged in", async () => {
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ tierId: "pro" }),
      })
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Sign in to subscribe");
  });
});
