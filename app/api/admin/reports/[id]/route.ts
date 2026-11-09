import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";
import { AdminActionError, dismissReport, suspendUser } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

/** POST /api/admin/reports/:id — { action: "dismiss" | "suspend" }. Audited. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
  try {
    if (body?.action === "dismiss") return NextResponse.json({ ok: true, ...(await dismissReport(id, admin.email)) });
    if (body?.action === "suspend") {
      const r = await prisma.userReport.findUnique({ where: { id }, select: { reportedId: true } });
      if (!r) return NextResponse.json({ error: "Report not found." }, { status: 404 });
      return NextResponse.json({ ok: true, ...(await suspendUser(r.reportedId, admin.email, id)) });
    }
    return NextResponse.json({ error: 'Send { action: "dismiss" | "suspend" }.' }, { status: 400 });
  } catch (e) {
    if (e instanceof AdminActionError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
