import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    campaign: { findUnique: vi.fn() },
    campaignApplication: { findUnique: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("@/lib/email", () => ({ sendApplicationReceivedEmail: vi.fn() }));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { sendApplicationReceivedEmail } = await import("@/lib/email");
const { POST } = await import("./route");

const flush = () => new Promise((r) => setTimeout(r, 0));
const params = Promise.resolve({ id: "c1" });
const req = (body: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(body) });

describe("POST /api/social/campaigns/[id]/apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "creator-1" }, expires: "" } as never);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ accountType: "creator" } as never) // role check
      .mockResolvedValueOnce({ name: "Maya", username: "maya" } as never); // email lookup
    vi.mocked(prisma.campaign.findUnique).mockResolvedValue({ status: "open", title: "Summer glow", brand: { email: "brand@x.com" } } as never);
    vi.mocked(prisma.campaignApplication.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.campaignApplication.create).mockResolvedValue({ id: "a1", message: "Love your SPF" } as never);
  });

  it("creates the application and emails the brand", async () => {
    const res = await POST(req({ message: "Love your SPF" }), { params });
    expect(res.status).toBe(201);
    await flush();
    expect(sendApplicationReceivedEmail).toHaveBeenCalledWith({
      brandEmail: "brand@x.com",
      campaignTitle: "Summer glow",
      creator: { name: "Maya", username: "maya" },
      pitch: "Love your SPF",
    });
  });

  it("still succeeds when the email fails", async () => {
    vi.mocked(sendApplicationReceivedEmail).mockRejectedValue(new Error("resend down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(req({ message: "hi" }), { params });
    expect(res.status).toBe(201);
    await flush();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("does not email on a duplicate application", async () => {
    vi.mocked(prisma.campaignApplication.findUnique).mockResolvedValue({ id: "a0" } as never);
    const res = await POST(req({}), { params });
    expect(res.status).toBe(409);
    await flush();
    expect(sendApplicationReceivedEmail).not.toHaveBeenCalled();
  });
});
