import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";
import { AdminActionError, suspendUser, unsuspendUser } from "@/lib/admin-actions";

/** POST /api/admin/users/:id/suspend — { suspended: boolean }. Audited. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { suspended?: unknown } | null;
  if (typeof body?.suspended !== "boolean") return NextResponse.json({ error: "Send { suspended: true | false }." }, { status: 400 });
  if (id === admin.id) return NextResponse.json({ error: "You can't suspend your own account." }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(body.suspended ? await suspendUser(id, admin.email) : await unsuspendUser(id, admin.email)) });
  } catch (e) {
    if (e instanceof AdminActionError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
