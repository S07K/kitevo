import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BLOCKED_MESSAGE, type ReportReason } from "@/lib/safety-shared";

export * from "@/lib/safety-shared";

/**
 * Report & block between accounts, and admin suspension.
 *
 * Block (either direction) stops: new conversations and messages, campaign applications,
 * new deals and new deal terms (propose/accept). It does NOT stop finishing what's already
 * agreed: payments, delivery, decline, withdraw and cancel still work, and existing threads
 * and deals stay readable. Blocked accounts also drop out of each other's discover/campaign
 * feeds.
 *
 * Suspension (admin, /admin/reports) stops sign-in, every action guarded by `activeGuard`,
 * and hides the account's public kit, profile and campaigns.
 */

/** Both directions at once: did I block them, did they block me. */
export async function blockState(me: string, other: string): Promise<{ iBlocked: boolean; theyBlocked: boolean }> {
  if (me === other) return { iBlocked: false, theyBlocked: false };
  const rows = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: me, blockedId: other }, { blockerId: other, blockedId: me }] },
    select: { blockerId: true },
  });
  return { iBlocked: rows.some((r) => r.blockerId === me), theyBlocked: rows.some((r) => r.blockerId === other) };
}

export async function isBlocked(a: string, b: string): Promise<boolean> {
  const s = await blockState(a, b);
  return s.iBlocked || s.theyBlocked;
}

/** Everyone this user blocked or was blocked by (for filtering feeds). */
export async function blockedIdsFor(userId: string): Promise<string[]> {
  const rows = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return [...new Set(rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)))];
}

/** A 403 response when the two are blocked either way, else null. */
export async function blockedGuard(a: string, b: string | null | undefined): Promise<NextResponse | null> {
  if (!b || a === b) return null;
  return (await isBlocked(a, b)) ? NextResponse.json({ error: BLOCKED_MESSAGE, code: "blocked" }, { status: 403 }) : null;
}

export async function block(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) return;
  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    create: { blockerId, blockedId },
    update: {},
  });
}

export async function unblock(blockerId: string, blockedId: string) {
  await prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });
}

/** A kit-inquiry sender the creator blocked: silently dropped (normalised email). */
export async function inquiryBlocked(creatorId: string, email: string): Promise<boolean> {
  return !!(await prisma.inquiryBlock.findUnique({ where: { userId_email: { userId: creatorId, email: email.trim().toLowerCase() } }, select: { id: true } }));
}

export async function createReport(input: { reporterId: string; reportedId: string; reason: ReportReason; note: string | null; context: string | null }) {
  // One open report per reporter/reported/context: a second click updates it instead of piling up.
  const open = await prisma.userReport.findFirst({
    where: { reporterId: input.reporterId, reportedId: input.reportedId, context: input.context, status: "open" },
    select: { id: true },
  });
  const report = open
    ? await prisma.userReport.update({ where: { id: open.id }, data: { reason: input.reason, note: input.note } })
    : await prisma.userReport.create({ data: input });
  if (!open) {
    const { inBackground } = await import("@/lib/background");
    inBackground("report-alert", async () => {
      const { sendReportAlert } = await import("@/lib/email");
      await sendReportAlert(report.id, input.reason);
    });
  }
  return report;
}

// ─── Suspension ────────────────────────────────────────────────────────────────

export async function isSuspended(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { suspendedAt: true } });
  return !!u?.suspendedAt;
}

export const SUSPENDED_MESSAGE = "This account has been suspended after a review of reports about it.";

/** A 403 when the acting user is suspended (sessions are JWTs, so sign-in alone can't cut them off). */
export async function activeGuard(userId: string): Promise<NextResponse | null> {
  return (await isSuspended(userId)) ? NextResponse.json({ error: SUSPENDED_MESSAGE, code: "suspended" }, { status: 403 }) : null;
}
