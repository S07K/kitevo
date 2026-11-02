import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findUnique: vi.fn() },
    campaignApplication: { findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock("@/lib/email", () => ({ sendApplicationDecisionEmail: vi.fn() }));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { sendApplicationDecisionEmail } = await import("@/lib/email");
const { PATCH } = await import("./route");

const flush = () => new Promise((r) => setTimeout(r, 0));
const params = Promise.resolve({ id: "c1" });
const patch = (body: unknown) => PATCH(new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), { params });

describe("PATCH /api/social/campaigns/[id]/applications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "brand-1" }, expires: "" } as never);
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
      brandId: "brand-1",
      title: "Summer glow",
      brand: { name: "Ana", brandProfile: { companyName: "Glowfield" } },
    } as never);
    vi.mocked(prisma.campaignApplication.update).mockResolvedValue({ id: "a1" } as never);
  });

  it("refuses an application from another campaign (no update, no email)", async () => {
    vi.mocked(prisma.campaignApplication.findFirst).mockResolvedValue(null);
    const res = await patch({ applicationId: "someone-elses", status: "accepted" });
    expect(res.status).toBe(404);
    expect(vi.mocked(prisma.campaignApplication.findFirst).mock.calls[0][0]).toMatchObject({ where: { id: "someone-elses", campaignId: "c1" } });
    expect(prisma.campaignApplication.update).not.toHaveBeenCalled();
    await flush();
    expect(sendApplicationDecisionEmail).not.toHaveBeenCalled();
  });

  it("emails the creator when the decision changes", async () => {
    vi.mocked(prisma.campaignApplication.findFirst).mockResolvedValue({ status: "pending", creator: { email: "maya@x.com" } } as never);
    expect((await patch({ applicationId: "a1", status: "accepted" })).status).toBe(200);
    await flush();
    expect(sendApplicationDecisionEmail).toHaveBeenCalledWith({
      creatorEmail: "maya@x.com",
      campaignId: "c1",
      campaignTitle: "Summer glow",
      brandName: "Glowfield",
      decision: "accepted",
    });
  });

  it("does not re-email on a repeat click or a move back to pending", async () => {
    vi.mocked(prisma.campaignApplication.findFirst).mockResolvedValue({ status: "accepted", creator: { email: "maya@x.com" } } as never);
    await patch({ applicationId: "a1", status: "accepted" });
    await patch({ applicationId: "a1", status: "pending" });
    await flush();
    expect(sendApplicationDecisionEmail).not.toHaveBeenCalled();
  });

  it("forbids a brand that doesn't own the campaign", async () => {
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ brandId: "other-brand", title: "x", brand: null } as never);
    expect((await patch({ applicationId: "a1", status: "accepted" })).status).toBe(403);
  });
});
