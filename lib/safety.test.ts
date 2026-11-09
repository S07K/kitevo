import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userBlock: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    inquiryBlock: { findUnique: vi.fn() },
    userReport: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));
vi.mock("@/lib/background", () => ({ inBackground: vi.fn() }));

const { prisma } = await import("@/lib/prisma");
const { inBackground } = await import("@/lib/background");
const s = await import("./safety");

describe("blocks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("knows which side blocked", async () => {
    vi.mocked(prisma.userBlock.findMany).mockResolvedValueOnce([{ blockerId: "b" }] as never);
    expect(await s.blockState("a", "b")).toEqual({ iBlocked: false, theyBlocked: true });
    vi.mocked(prisma.userBlock.findMany).mockResolvedValueOnce([{ blockerId: "a" }, { blockerId: "b" }] as never);
    expect(await s.blockState("a", "b")).toEqual({ iBlocked: true, theyBlocked: true });
    expect(await s.blockState("a", "a")).toEqual({ iBlocked: false, theyBlocked: false });
  });

  it("guards with a 403 that doesn't say who blocked whom", async () => {
    vi.mocked(prisma.userBlock.findMany).mockResolvedValueOnce([{ blockerId: "b" }] as never);
    const res = await s.blockedGuard("a", "b");
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ error: s.BLOCKED_MESSAGE, code: "blocked" });
    vi.mocked(prisma.userBlock.findMany).mockResolvedValueOnce([] as never);
    expect(await s.blockedGuard("a", "b")).toBeNull();
    // No other account (email-only brand) → nothing to check.
    expect(await s.blockedGuard("a", null)).toBeNull();
  });

  it("lists everyone blocked either way, once", async () => {
    vi.mocked(prisma.userBlock.findMany).mockResolvedValueOnce([
      { blockerId: "me", blockedId: "x" },
      { blockerId: "y", blockedId: "me" },
      { blockerId: "x", blockedId: "me" },
    ] as never);
    expect((await s.blockedIdsFor("me")).sort()).toEqual(["x", "y"]);
  });

  it("never blocks yourself; inquiry blocks match the normalised email", async () => {
    await s.block("a", "a");
    expect(prisma.userBlock.upsert).not.toHaveBeenCalled();
    vi.mocked(prisma.inquiryBlock.findUnique).mockResolvedValueOnce({ id: "1" } as never);
    expect(await s.inquiryBlocked("c", "  Spam@X.com ")).toBe(true);
    expect(prisma.inquiryBlock.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { userId_email: { userId: "c", email: "spam@x.com" } } }));
  });
});

describe("reports", () => {
  beforeEach(() => vi.clearAllMocks());
  const input = { reporterId: "a", reportedId: "b", reason: "scam" as const, note: "asked for UPI", context: "conversation:c1" };

  it("creates a report and alerts admins once", async () => {
    vi.mocked(prisma.userReport.findFirst).mockResolvedValueOnce(null);
    vi.mocked(prisma.userReport.create).mockResolvedValueOnce({ id: "r1" } as never);
    await s.createReport(input);
    expect(prisma.userReport.create).toHaveBeenCalledWith({ data: input });
    expect(inBackground).toHaveBeenCalledTimes(1);
  });

  it("a second report from the same place updates the open one, no new alert", async () => {
    vi.mocked(prisma.userReport.findFirst).mockResolvedValueOnce({ id: "r1" } as never);
    vi.mocked(prisma.userReport.update).mockResolvedValueOnce({ id: "r1" } as never);
    await s.createReport({ ...input, reason: "spam" });
    expect(prisma.userReport.update).toHaveBeenCalledWith({ where: { id: "r1" }, data: { reason: "spam", note: "asked for UPI" } });
    expect(prisma.userReport.create).not.toHaveBeenCalled();
    expect(inBackground).not.toHaveBeenCalled();
  });
});

describe("shared rules", () => {
  it("accepts only known reasons and contexts", () => {
    expect(s.isReportReason("scam")).toBe(true);
    expect(s.isReportReason("vibes")).toBe(false);
    expect(s.cleanReportContext("deal:abc_123")).toBe("deal:abc_123");
    expect(s.cleanReportContext("profile")).toBe("profile");
    expect(s.cleanReportContext("deal:<script>")).toBeNull();
    expect(s.cleanReportContext("wallet:1")).toBeNull();
  });
});

describe("suspension", () => {
  it("activeGuard refuses suspended accounts", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ suspendedAt: new Date() } as never);
    expect((await s.activeGuard("u"))?.status).toBe(403);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ suspendedAt: null } as never);
    expect(await s.activeGuard("u")).toBeNull();
  });
});
