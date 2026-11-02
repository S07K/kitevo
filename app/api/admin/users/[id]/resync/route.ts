import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";
import { AdminActionError, resyncPlan } from "@/lib/admin-actions";

/** POST /api/admin/users/:id/resync — re-derive the badge from the provider's live subscription + comp. Audited. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await params;
  try {
    const after = await resyncPlan(id, admin.email);
    return NextResponse.json({ ok: true, ...after });
  } catch (e) {
    if (e instanceof AdminActionError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
