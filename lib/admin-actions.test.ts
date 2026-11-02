import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    adminAuditLog: { create: vi.fn() },
  },
}));
const getSubscription = vi.fn();
vi.mock("@/lib/payments", () => ({ payments: { id: "dodo", getSubscription } }));
vi.mock("@/config/subscriptions", () => ({
  getTierById: (id: string | null) => (id && ["free", "starter", "pro", "brand"].includes(id) ? { id } : null),
  getVerifiedTierForPriceId: (p: string | null) => (p === "price_brand" ? "brand_verified" : p ? "creator_pro" : null),
  resolveVerifiedTier: (sub: string | null, comp: string | null) =>
    sub ?? (comp === "brand" ? "brand_verified" : comp ? "creator_pro" : null),
}));

const { prisma } = await import("@/lib/prisma");
const { setComp, resyncPlan, AdminActionError } = await import("./admin-actions");

const user = (over: Record<string, unknown> = {}) => ({
  id: "u1", stripeCustomerId: null, compedTier: null, verifiedTier: null, ...over,
});

describe("setComp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
  });

  it("grants a comp and its badge for a user with no customer", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user() as never);
    const after = await setComp("u1", "pro", "admin@x.com");
    expect(after).toEqual({ compedTier: "pro", verifiedTier: "creator_pro" });
    expect(getSubscription).not.toHaveBeenCalled();
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actor: "admin@x.com", action: "comp.set", targetUserId: "u1" }),
    });
  });

  it("keeps a paying user's badge when the comp is revoked", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      user({ stripeCustomerId: "cus_1", compedTier: "pro", verifiedTier: "brand_verified" }) as never
    );
    getSubscription.mockResolvedValue({ isActive: true, priceId: "price_brand", status: "active" });
    const after = await setComp("u1", null, "admin@x.com");
    expect(after.verifiedTier).toBe("brand_verified");
  });

  it("writes nothing when the provider lookup fails", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user({ stripeCustomerId: "cus_1" }) as never);
    getSubscription.mockRejectedValue(new Error("timeout"));
    await expect(setComp("u1", null, "a")).rejects.toBeInstanceOf(AdminActionError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects unknown tiers and the free tier", async () => {
    await expect(setComp("u1", "platinum", "a")).rejects.toBeInstanceOf(AdminActionError);
    await expect(setComp("u1", "free", "a")).rejects.toBeInstanceOf(AdminActionError);
  });
});

describe("resyncPlan", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears a stale badge when the subscription is no longer active", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      user({ stripeCustomerId: "cus_1", verifiedTier: "creator_pro" }) as never
    );
    getSubscription.mockResolvedValue({ isActive: false, priceId: "price_pro", status: "canceled" });
    const after = await resyncPlan("u1", "a");
    expect(after.verifiedTier).toBeNull();
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "u1" }, data: { verifiedTier: null } });
  });

  it("leaves a hand-granted top_creator badge alone", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user({ verifiedTier: "top_creator" }) as never);
    const after = await resyncPlan("u1", "a");
    expect(after.verifiedTier).toBe("top_creator");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
