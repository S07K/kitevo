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

describe("POST /api/create-checkout-session — trials and codes", () => {
  const fresh = { accountType: "creator", emailVerified: true, stripeCustomerId: null, compedTier: null };
  const post = (body: object) =>
    POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));

  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1", email: "a@b.com" }, expires: "" });
    vi.mocked(payments.getSubscription).mockResolvedValue(null);
    vi.mocked(payments.createCheckout).mockClear();
  });

  it("starts a 14-day trial for an eligible creator on Pro", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fresh as never);
    const res = await post({ tierId: "pro", trial: true });
    expect(res.status).toBe(200);
    expect(payments.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ trialDays: 14 }));
  });

  it("never trusts the client: a returning subscriber asking for a trial is refused", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...fresh, stripeCustomerId: "cus_old" } as never);
    const res = await post({ tierId: "pro", trial: true });
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe("used");
    expect(payments.createCheckout).not.toHaveBeenCalled();
  });

  it("refuses a trial on any tier other than Pro", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fresh as never);
    const res = await post({ tierId: "starter", trial: true });
    expect(res.status).toBe(400);
    expect(payments.createCheckout).not.toHaveBeenCalled();
  });

  it("asks unverified accounts to verify first", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...fresh, emailVerified: false } as never);
    const res = await post({ tierId: "pro", trial: true });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/verify your email/i);
  });

  it("sends no trial when none was asked for", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fresh as never);
    await post({ tierId: "pro" });
    expect(payments.createCheckout).toHaveBeenCalledWith(expect.objectContaining({ trialDays: undefined }));
  });

  it("passes a sanitised discount code through, and drops junk", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fresh as never);
    await post({ tierId: "starter", code: " launch20 " });
    expect(payments.createCheckout).toHaveBeenLastCalledWith(expect.objectContaining({ discountCode: "LAUNCH20" }));
    await post({ tierId: "starter", code: "<b>nope</b>" });
    expect(payments.createCheckout).toHaveBeenLastCalledWith(expect.objectContaining({ discountCode: undefined }));
  });
});
