import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn(), update: vi.fn() } } }));
vi.mock("@/lib/subscription-cache", () => ({ getCachedSubscription: vi.fn(), invalidateSubscription: vi.fn() }));
vi.mock("@/lib/payments", () => ({
  payments: { id: "dodo", isCheckoutSessionId: () => false, getCheckout: vi.fn(), getSubscription: vi.fn(), getSubscriptionById: vi.fn() },
}));
vi.mock("@/config/subscriptions", async (orig) => {
  const real = await orig<typeof import("@/config/subscriptions")>();
  return { ...real, getVerifiedTierForPriceId: (p: string | null) => (p ? "creator_pro" : null) };
});

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { payments } = await import("@/lib/payments");
const { invalidateSubscription, getCachedSubscription } = await import("@/lib/subscription-cache");
const { POST } = await import("./route");

const post = (body: object) => POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }));
const sub = { id: "sub_abc123", customerId: "cus_9", status: "active", priceId: "prod_pro", isActive: true, itemId: null } as const;

describe("POST /api/subscription-status with a Dodo subscription_id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user_1" }, expires: "" });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ compedTier: null, stripeCustomerId: null } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(getCachedSubscription).mockResolvedValue(null);
  });

  it("links the plan when the subscription belongs to the signed-in user", async () => {
    vi.mocked(payments.getSubscriptionById!).mockResolvedValue({ subscription: { ...sub }, userId: "user_1" });
    await post({ subscription_id: "sub_abc123" });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user_1" }, data: expect.objectContaining({ stripeCustomerId: "cus_9", verifiedTier: "creator_pro" }) }),
    );
    expect(invalidateSubscription).toHaveBeenCalledWith("cus_9");
  });

  it("links nothing when the subscription belongs to someone else", async () => {
    vi.mocked(payments.getSubscriptionById!).mockResolvedValue({ subscription: { ...sub }, userId: "someone_else" });
    await post({ subscription_id: "sub_abc123" });
    expect(prisma.user.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ stripeCustomerId: "cus_9" }) }));
    expect(invalidateSubscription).not.toHaveBeenCalled();
  });

  it("links nothing for signed-out visitors", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(payments.getSubscriptionById!).mockResolvedValue({ subscription: { ...sub }, userId: "user_1" });
    await post({ subscription_id: "sub_abc123" });
    expect(payments.getSubscriptionById).not.toHaveBeenCalled();
  });
});
