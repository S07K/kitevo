import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_REPORT_NOTE, block, cleanReportContext, createReport, isReportReason } from "@/lib/safety";

export const dynamic = "force-dynamic";

/**
 * POST { userId, reason, note?, context?, alsoBlock? } — report an account to Kitevo.
 * The reported account is never told who reported them.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const me = session?.user?.id;
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`report:${me}`, 10, 60 * 60_000).ok) return NextResponse.json({ error: "Too many reports in a short time. Try again later." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { userId?: unknown; reason?: unknown; note?: unknown; context?: unknown; alsoBlock?: unknown };
  const target = typeof body.userId === "string" && body.userId.length <= 64 ? body.userId : null;
  if (!target || target === me) return NextResponse.json({ error: "Pick an account to report." }, { status: 400 });
  if (!isReportReason(body.reason)) return NextResponse.json({ error: "Choose a reason.", field: "reason" }, { status: 400 });
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, MAX_REPORT_NOTE) : null;
  if (!(await prisma.user.findUnique({ where: { id: target }, select: { id: true } }))) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  await createReport({ reporterId: me, reportedId: target, reason: body.reason, note, context: cleanReportContext(body.context) });
  if (body.alsoBlock === true) await block(me, target);
  return NextResponse.json({ ok: true, blocked: body.alsoBlock === true }, { status: 201 });
}
