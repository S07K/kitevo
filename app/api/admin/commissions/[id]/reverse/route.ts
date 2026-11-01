import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";
import { reverseCommission } from "@/lib/referrals";

/** POST /api/admin/commissions/:id/reverse — void an unpaid commission (e.g. a manual refund). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await params;
  const ok = await reverseCommission(id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Only unpaid commissions can be reversed." }, { status: 409 });
}
