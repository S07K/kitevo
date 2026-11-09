import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => {
  const prisma = {
    user: { findUnique: vi.fn(), update: vi.fn((a: unknown) => a) },
    userReport: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn((a: unknown) => a) },
    adminAuditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma };
});
vi.mock("@/lib/payments", () => ({ payments: { id: "dodo", getSubscription: vi.fn() } }));

const { prisma } = await import("@/lib/prisma");
const { dismissReport, suspendUser, unsuspendUser, AdminActionError } = await import("./admin-actions");

const audit = () => vi.mocked(prisma.adminAuditLog.create).mock.calls.map((c) => (c[0] as { data: { action: string; targetUserId: string } }).data);

describe("report & suspension admin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, { count: 2 }] as never);
  });

  it("dismisses an open report, audited; a closed one can't be dismissed again", async () => {
    vi.mocked(prisma.userReport.findUnique).mockResolvedValueOnce({ status: "open", reportedId: "bad" } as never);
    await dismissReport("r1", "admin@x.com");
    expect(prisma.userReport.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "r1" }, data: expect.objectContaining({ status: "dismissed", resolvedBy: "admin@x.com" }) }));
    expect(audit()).toEqual([expect.objectContaining({ action: "report.dismiss", targetUserId: "bad" })]);
    vi.mocked(prisma.userReport.findUnique).mockResolvedValueOnce({ status: "dismissed", reportedId: "bad" } as never);
    await expect(dismissReport("r1", "admin@x.com")).rejects.toBeInstanceOf(AdminActionError);
  });

  it("suspends: sets suspendedAt and closes all their open reports in one transaction", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ suspendedAt: null } as never);
    const out = await suspendUser("bad", "admin@x.com", "r1");
    expect(out).toEqual({ suspended: true, reportsClosed: 2 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.userReport.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { reportedId: "bad", status: "open" }, data: expect.objectContaining({ status: "actioned" }) }));
    expect(audit()).toEqual([expect.objectContaining({ action: "user.suspend", targetUserId: "bad" })]);
  });

  it("keeps the original suspension date when suspended again", async () => {
    const first = new Date("2026-11-01T00:00:00Z");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ suspendedAt: first } as never);
    await suspendUser("bad", "admin@x.com");
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "bad" }, data: { suspendedAt: first } });
  });

  it("lifts a suspension, audited", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ suspendedAt: new Date() } as never);
    await unsuspendUser("bad", "admin@x.com");
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: "bad" }, data: { suspendedAt: null } });
    expect(audit()).toEqual([expect.objectContaining({ action: "user.unsuspend" })]);
  });
});
