import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    kit: { findMany: vi.fn() },
    deal: { findMany: vi.fn() },
    product: { groupBy: vi.fn() },
    order: { findMany: vi.fn() },
    inquiry: { count: vi.fn() },
    schedulerConnection: { count: vi.fn() },
    paymentConnection: { count: vi.fn() },
    aiConnection: { count: vi.fn() },
  },
}));

const { prisma } = await import("@/lib/prisma");
const { workspaceSummary } = await import("./workspace-summary");

describe("workspaceSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_API_KEY;
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ instagramUserId: null, instagramAccessToken: null, youtubeChannelId: "yt", youtubeAccessToken: "tok" } as never);
    vi.mocked(prisma.kit.findMany).mockResolvedValue([
      { rates: JSON.stringify({ show: true, items: [{ id: "1", label: "Reel", price: 400 }] }), booking: "{}", manualStats: "{}" },
      { rates: "{}", booking: JSON.stringify({ url: "https://calendly.com/asha/intro", label: "Book" }), manualStats: JSON.stringify({ instagramFollowers: 1000 }) },
    ] as never);
    vi.mocked(prisma.deal.findMany).mockResolvedValue([
      { id: "d1", title: "Reel", brandName: "Oats", status: "proposed", versions: [{ proposedBy: "brand", currency: "INR" }], payments: [] },
      { id: "d2", title: "Story", brandName: "Tea", status: "proposed", versions: [{ proposedBy: "creator", currency: "INR" }], payments: [] },
      { id: "d3", title: "Video", brandName: "Shoe", status: "accepted", versions: [{ proposedBy: "brand", currency: "USD" }], payments: [{ status: "due", amountCents: 25000 }, { status: "paid", amountCents: 25000 }] },
    ] as never);
    vi.mocked(prisma.product.groupBy).mockResolvedValue([{ status: "published", _count: { _all: 2 } }, { status: "draft", _count: { _all: 1 } }] as never);
    vi.mocked(prisma.order.findMany).mockResolvedValue([
      { status: "free", amountCents: 0, currency: "USD" },
      { status: "paid", amountCents: 1500, currency: "USD" },
      { status: "paid", amountCents: 900, currency: "INR" },
      { status: "paid", amountCents: 500, currency: "USD" },
    ] as never);
    vi.mocked(prisma.inquiry.count).mockResolvedValue(3);
    vi.mocked(prisma.schedulerConnection.count).mockResolvedValue(1);
    vi.mocked(prisma.paymentConnection.count).mockResolvedValue(0);
    vi.mocked(prisma.aiConnection.count).mockResolvedValue(0);
  });

  it("summarises deals, products, inquiries and setup from the creator's rows", async () => {
    const s = await workspaceSummary("u1");
    expect(s.deals.yourTurn).toBe(1);
    expect(s.deals.toDeliver).toBe(1);
    expect(s.deals.active.map((d) => [d.id, d.awaiting, d.dueCents])).toEqual([["d1", "creator", 0], ["d2", "brand", 0], ["d3", null, 25000]]);
    expect(s.products).toEqual({ published: 2, drafts: 1, claims30d: 1, sales30d: 3, revenue30d: [{ currency: "USD", cents: 2000 }, { currency: "INR", cents: 900 }] });
    expect(s.inquiries.new).toBe(3);
    expect(s.setup).toEqual({ hasRates: true, bookingOn: true, schedulerConnected: true, paymentConnected: false, statsConnected: true, hasManualStats: true, copilotReady: false });
  });

  it("only counts the creator's own active deals", async () => {
    await workspaceSummary("u1");
    expect(vi.mocked(prisma.deal.findMany).mock.calls[0][0]).toMatchObject({ where: { creatorId: "u1", status: { in: ["proposed", "accepted", "delivered"] } } });
  });
});
