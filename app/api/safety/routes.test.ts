import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    userBlock: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    inquiryBlock: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    inquiry: { findFirst: vi.fn() },
    userReport: { findFirst: vi.fn(), create: vi.fn(async () => ({ id: "r1" })), update: vi.fn() },
  },
}));
vi.mock("@/lib/background", () => ({ inBackground: vi.fn() }));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const block = await import("./block/route");
const report = await import("./report/route");
const inquiryBlock = await import("./inquiry-block/route");

const json = (b: object) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

describe("safety routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "me" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "other" } as never);
  });

  it("need a session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never);
    expect((await block.POST(new Request("http://x", json({ userId: "other" })))).status).toBe(401);
    expect((await report.POST(new Request("http://x", json({ userId: "other", reason: "spam" })))).status).toBe(401);
    expect((await inquiryBlock.POST(new Request("http://x", json({ inquiryId: "q" })))).status).toBe(401);
  });

  it("block: not yourself, real accounts only, idempotent; unblock deletes only my block", async () => {
    expect((await block.POST(new Request("http://x", json({ userId: "me" })))).status).toBe(400);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null);
    expect((await block.POST(new Request("http://x", json({ userId: "ghost" })))).status).toBe(404);
    expect((await block.POST(new Request("http://x", json({ userId: "other" })))).status).toBe(200);
    expect(prisma.userBlock.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { blockerId: "me", blockedId: "other" } }));
    await block.DELETE(new Request("http://x?userId=other", { method: "DELETE" }));
    expect(prisma.userBlock.deleteMany).toHaveBeenCalledWith({ where: { blockerId: "me", blockedId: "other" } });
  });

  it("report: needs a known reason, trims the note, can block in the same step", async () => {
    expect((await report.POST(new Request("http://x", json({ userId: "other", reason: "vibes" })))).status).toBe(400);
    expect((await report.POST(new Request("http://x", json({ userId: "me", reason: "spam" })))).status).toBe(400);
    const res = await report.POST(new Request("http://x", json({ userId: "other", reason: "scam", note: "  " + "x".repeat(1200), context: "deal:d1", alsoBlock: true })));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true, blocked: true });
    const data = vi.mocked(prisma.userReport.create).mock.calls[0][0].data;
    expect(data).toMatchObject({ reporterId: "me", reportedId: "other", reason: "scam", context: "deal:d1" });
    expect(data.note).toHaveLength(1000);
    expect(prisma.userBlock.upsert).toHaveBeenCalled();
  });

  it("report: drops a context that isn't one of ours", async () => {
    await report.POST(new Request("http://x", json({ userId: "other", reason: "spam", context: "javascript:alert(1)" })));
    expect(vi.mocked(prisma.userReport.create).mock.calls[0][0].data.context).toBeNull();
  });

  it("inquiry block: only for inquiries on my own kits, stored lowercased", async () => {
    vi.mocked(prisma.inquiry.findFirst).mockResolvedValueOnce(null);
    expect((await inquiryBlock.POST(new Request("http://x", json({ inquiryId: "q-not-mine" })))).status).toBe(404);
    expect(vi.mocked(prisma.inquiry.findFirst).mock.calls[0][0]).toMatchObject({ where: { id: "q-not-mine", kit: { userId: "me" } } });
    vi.mocked(prisma.inquiry.findFirst).mockResolvedValueOnce({ email: "Spam@X.com" } as never);
    expect((await inquiryBlock.POST(new Request("http://x", json({ inquiryId: "q1" })))).status).toBe(200);
    expect(prisma.inquiryBlock.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { userId: "me", email: "spam@x.com" } }));
  });
});
