import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    aiConnection: { findUnique: vi.fn() },
    copilotUsage: { count: vi.fn(), create: vi.fn() },
    kit: { findFirst: vi.fn() },
    campaign: { findUnique: vi.fn() },
    inquiry: { findFirst: vi.fn() },
    conversationParticipant: { findUnique: vi.fn(), findFirst: vi.fn() },
    message: { findMany: vi.fn() },
    userBlock: { findMany: vi.fn(async () => []) },
  },
}));
vi.mock("@/lib/token-crypto", () => ({ decryptToken: (v: string) => v, encryptToken: (v: string) => v }));
vi.mock("@/lib/creator-plan", () => ({ creatorPlanId: vi.fn() }));
vi.mock("@/lib/kit-view-data", () => ({ loadKitViewData: vi.fn(async () => ({ live: {} })) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/ai/client", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/client")>()), complete: vi.fn() }));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { creatorPlanId } = await import("@/lib/creator-plan");
const { complete, AiError } = await import("@/lib/ai/client");
const { trackEvent } = await import("@/lib/analytics");
const { GET, POST } = await import("./route");

const post = (b: object) => POST(new Request("http://x", { method: "POST", body: JSON.stringify(b) }));
const USER = { id: "u1", accountType: "creator", name: "Asha Rao", bio: "", location: null, niches: '["Food"]' };
const KIT = { id: "k1", slug: "asha", manualStats: '{"instagramFollowers":12000}', rates: "{}", brands: "[]", passwordHash: null };

describe("/api/copilot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AI_API_KEY = "kitevo-key";
    process.env.AI_PROVIDER = "groq";
    delete process.env.COPILOT_MONTHLY_LIMIT;
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as never);
    vi.mocked(prisma.aiConnection.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.copilotUsage.count).mockResolvedValue(0);
    vi.mocked(prisma.kit.findFirst).mockResolvedValue(KIT as never);
    vi.mocked(creatorPlanId).mockResolvedValue("pro");
    vi.mocked(complete).mockResolvedValue({ text: "Here's a bio:\nFood stories from home.", model: "m" });
  });
  afterEach(() => {
    delete process.env.AI_API_KEY;
    delete process.env.AI_PROVIDER;
  });

  it("is for signed-in creators only, and refuses unknown tasks", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as never);
    expect((await post({ task: "bio" })).status).toBe(401);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ ...USER, accountType: "brand" } as never);
    expect((await post({ task: "bio" })).status).toBe(401);
    expect((await post({ task: "write_contract" })).status).toBe(400);
  });

  it("Pro on Kitevo's key: drafts from the kit, cleans the text, counts usage", async () => {
    const res = await post({ task: "bio", kitId: "k1" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "Food stories from home.", status: { ok: true, source: "kitevo", remaining: 49, limit: 50 } });
    const [target, prompt] = vi.mocked(complete).mock.calls[0];
    expect(target).toMatchObject({ provider: "groq", apiKey: "kitevo-key" });
    expect(prompt.prompt).toContain("12K followers");
    expect(prompt.prompt).toContain("self-reported");
    expect(prisma.copilotUsage.create).toHaveBeenCalledWith({ data: { userId: "u1", task: "bio", source: "kitevo" } });
    expect(trackEvent).toHaveBeenCalledWith("copilot_used", { userId: "u1", props: { task: "bio", source: "kitevo" } });
  });

  it("Kitevo's key needs Pro; the monthly cap is enforced", async () => {
    vi.mocked(creatorPlanId).mockResolvedValueOnce("starter");
    const r1 = await post({ task: "bio" });
    expect(r1.status).toBe(403);
    expect(await r1.json()).toMatchObject({ code: "plan_required" });

    process.env.COPILOT_MONTHLY_LIMIT = "5";
    vi.mocked(prisma.copilotUsage.count).mockResolvedValueOnce(5);
    const r2 = await post({ task: "bio" });
    expect(await r2.json()).toMatchObject({ code: "limit_reached" });
    expect(complete).not.toHaveBeenCalled();
  });

  it("without any key, says so and sends nothing", async () => {
    delete process.env.AI_API_KEY;
    const res = await post({ task: "bio" });
    expect(await res.json()).toMatchObject({ code: "not_configured" });
    expect(complete).not.toHaveBeenCalled();
  });

  it("a creator's own key works on any plan with no cap", async () => {
    delete process.env.AI_API_KEY;
    vi.mocked(creatorPlanId).mockResolvedValue(null);
    vi.mocked(prisma.copilotUsage.count).mockResolvedValue(9999);
    vi.mocked(prisma.aiConnection.findUnique).mockResolvedValue({ provider: "openrouter", keyEncrypted: "sk-or-own", model: "qwen/qwen3:free" } as never);
    const res = await post({ task: "bio" });
    expect(res.status).toBe(200);
    expect((await res.json()).status).toEqual({ ok: true, source: "own", provider: "openrouter", providerName: "OpenRouter" });
    expect(vi.mocked(complete).mock.calls[0][0]).toMatchObject({ provider: "openrouter", apiKey: "sk-or-own", model: "qwen/qwen3:free" });
    expect(prisma.copilotUsage.create).toHaveBeenCalledWith({ data: { userId: "u1", task: "bio", source: "own" } });
  });

  it("pitch: open campaigns only, brand text passed as data", async () => {
    vi.mocked(prisma.campaign.findUnique).mockResolvedValueOnce({ status: "draft" } as never);
    expect((await post({ task: "pitch", campaignId: "c1" })).status).toBe(404);
    vi.mocked(prisma.campaign.findUnique).mockResolvedValueOnce({
      title: "Breakfast reels",
      description: "Show our oats",
      niche: "Food",
      budget: "$500",
      status: "open",
      brand: { name: "x", brandProfile: { companyName: "Oats Co" } },
    } as never);
    expect((await post({ task: "pitch", campaignId: "c1" })).status).toBe(200);
    expect(vi.mocked(complete).mock.calls[0][1].prompt).toContain("Campaign from Oats Co");
  });

  it("inquiry replies only for the creator's own inquiries", async () => {
    vi.mocked(prisma.inquiry.findFirst).mockResolvedValueOnce(null);
    expect((await post({ task: "inquiry_reply", inquiryId: "q1" })).status).toBe(404);
    expect(vi.mocked(prisma.inquiry.findFirst).mock.calls[0][0]).toMatchObject({ where: { id: "q1", kit: { userId: "u1" } } });
  });

  it("explains provider failures in terms of whose key failed, and doesn't count them", async () => {
    vi.mocked(prisma.aiConnection.findUnique).mockResolvedValue({ provider: "groq", keyEncrypted: "gsk_own", model: null } as never);
    vi.mocked(complete).mockRejectedValueOnce(new AiError("auth", "x"));
    const res = await post({ task: "bio" });
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ code: "ai_auth", error: expect.stringMatching(/Update it in Connectors/) });
    expect(prisma.copilotUsage.create).not.toHaveBeenCalled();
  });

  it("GET reports the status without any key", async () => {
    vi.mocked(prisma.copilotUsage.count).mockResolvedValueOnce(12);
    expect(await (await GET()).json()).toEqual({ ok: true, source: "kitevo", remaining: 38, limit: 50 });
  });

  it("message drafts: my threads with a brand only, never across a block", async () => {
    vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValueOnce(null);
    expect((await post({ task: "message", conversationId: "cv1" })).status).toBe(404);

    vi.mocked(prisma.conversationParticipant.findUnique).mockResolvedValue({ id: "p" } as never);
    vi.mocked(prisma.conversationParticipant.findFirst).mockResolvedValue({ userId: "b1", user: { name: "x", accountType: "brand", brandProfile: { companyName: "Oats Co" } } } as never);
    vi.mocked(prisma.userBlock.findMany).mockResolvedValueOnce([{ blockerId: "b1" }] as never);
    expect((await post({ task: "message", conversationId: "cv1" })).status).toBe(403);

    vi.mocked(prisma.message.findMany).mockResolvedValueOnce([
      { senderId: "u1", body: "Here are my ideas", createdAt: new Date(Date.now() - 3 * 86_400_000) },
      { senderId: "b1", body: "Thanks!", createdAt: new Date(Date.now() - 4 * 86_400_000) },
    ] as never);
    const res = await post({ task: "message", conversationId: "cv1" });
    expect(res.status).toBe(200);
    // Newest-first rows are put back in order: the creator spoke last → a follow-up.
    expect(vi.mocked(complete).mock.calls.at(-1)![1].prompt).toMatch(/hasn't heard back for 3 days/);
    expect(prisma.copilotUsage.create).toHaveBeenCalledWith({ data: { userId: "u1", task: "message", source: "kitevo" } });
  });
});
