import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    campaignApplication: { findUnique: vi.fn() },
    conversationParticipant: { findMany: vi.fn() },
    inquiry: { findUnique: vi.fn() },
    deal: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/safety", () => ({ activeGuard: vi.fn(async () => null), blockedGuard: vi.fn(async () => null) }));
vi.mock("@/lib/deals", async (o) => ({ ...(await o<typeof import("@/lib/deals")>()), createDeal: vi.fn(async () => ({ id: "d1" })) }));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { createDeal } = await import("@/lib/deals");
const { blockedGuard } = await import("@/lib/safety");
const { POST } = await import("./route");

const quote = { deliverables: [{ label: "Reel", quantity: 1 }], amount: "25000", currency: "INR" };
const post = (b: object) => POST(new Request("http://x", { method: "POST", body: JSON.stringify({ title: "Diwali Reel", quote, ...b }) }));
const asUser = (u: object) => {
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: (u as { id: string }).id } } as never);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ brandProfile: null, name: "Me", username: "me", email: "me@x.com", ...u } as never);
};

describe("POST /api/deals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("direct (creator): needs the brand's name and a valid email; the creator proposes", async () => {
    asUser({ id: "u_c", accountType: "creator" });
    expect(await (await post({ source: "direct", brandName: "Glowfield", brandEmail: "nope" })).json()).toMatchObject({ field: "brandEmail" });
    expect((await post({ source: "direct", brandName: "Glowfield", brandEmail: "pr@glow.com" })).status).toBe(201);
    expect(createDeal).toHaveBeenCalledWith(expect.objectContaining({ creatorId: "u_c", brandUserId: null, brandEmail: "pr@glow.com", proposedBy: "creator", quote: expect.objectContaining({ amountCents: 2500000 }) }));
  });

  it("brands can't create direct deals", async () => {
    asUser({ id: "u_b", accountType: "brand" });
    expect((await post({ source: "direct", brandName: "X", brandEmail: "x@x.com" })).status).toBe(400);
  });

  it("inquiry: only the kit owner, and the brand comes from the inquiry (not the request)", async () => {
    asUser({ id: "u_c", accountType: "creator" });
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValueOnce({ id: "i1", name: "Ana", company: "Glowfield", email: "ana@glow.com", kit: { userId: "someone_else" } } as never);
    expect((await post({ source: "inquiry", ref: "i1" })).status).toBe(404);
    vi.mocked(prisma.inquiry.findUnique).mockResolvedValueOnce({ id: "i1", name: "Ana", company: "Glowfield", email: "ana@glow.com", kit: { userId: "u_c" } } as never);
    await post({ source: "inquiry", ref: "i1", brandEmail: "attacker@evil.com" });
    expect(createDeal).toHaveBeenCalledWith(expect.objectContaining({ brandName: "Glowfield", brandEmail: "ana@glow.com", inquiryId: "i1" }));
  });

  it("campaign: either party of the application; brand is the campaign owner", async () => {
    asUser({ id: "u_b", accountType: "brand" });
    const app = { id: "a1", creatorId: "u_c", campaign: { brandId: "u_b", brand: { email: "brand@x.com", name: "B", username: "b", brandProfile: { companyName: "Glowfield" } } } };
    vi.mocked(prisma.campaignApplication.findUnique).mockResolvedValue(app as never);
    await post({ source: "campaign", ref: "a1" });
    expect(createDeal).toHaveBeenCalledWith(expect.objectContaining({ creatorId: "u_c", brandUserId: "u_b", brandName: "Glowfield", proposedBy: "brand" }));
    asUser({ id: "outsider", accountType: "creator" });
    expect((await post({ source: "campaign", ref: "a1" })).status).toBe(404);
  });

  it("conversation: must be in it, and it must be creator ↔ brand", async () => {
    asUser({ id: "u_c", accountType: "creator" });
    vi.mocked(prisma.conversationParticipant.findMany).mockResolvedValueOnce([{ userId: "x" }, { userId: "y" }] as never);
    expect((await post({ source: "conversation", ref: "c1" })).status).toBe(404);
    vi.mocked(prisma.conversationParticipant.findMany).mockResolvedValueOnce([
      { userId: "u_c", user: { id: "u_c", accountType: "creator" } },
      { userId: "u_c2", user: { id: "u_c2", accountType: "creator", email: "c2@x.com" } },
    ] as never);
    expect((await post({ source: "conversation", ref: "c1" })).status).toBe(400);
  });

  it("rejects bad quotes and missing titles before anything is created", async () => {
    asUser({ id: "u_c", accountType: "creator" });
    expect(await (await post({ source: "direct", quote: { ...quote, amount: "0" } })).json()).toMatchObject({ field: "amount" });
    expect(await (await post({ source: "direct", title: " " })).json()).toMatchObject({ field: "title" });
    expect(createDeal).not.toHaveBeenCalled();
  });

  it("no new deal between accounts that blocked each other", async () => {
    asUser({ id: "c1", accountType: "creator" });
    vi.mocked(prisma.campaignApplication.findUnique).mockResolvedValue({ id: "a1", creatorId: "c1", status: "accepted", campaign: { brandId: "b1", title: "T", brand: { email: "b@x.com", name: "B", username: "b", brandProfile: { companyName: "Brand" } } } } as never);
    vi.mocked(blockedGuard).mockResolvedValueOnce(new Response(JSON.stringify({ error: "blocked", code: "blocked" }), { status: 403 }) as never);
    const res = await post({ source: "campaign", ref: "a1" });
    expect(res.status).toBe(403);
    expect(blockedGuard).toHaveBeenCalledWith("c1", "b1");
    expect(createDeal).not.toHaveBeenCalled();
  });
});
