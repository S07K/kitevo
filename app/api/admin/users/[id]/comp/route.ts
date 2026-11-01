import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";
import { AdminActionError, setComp } from "@/lib/admin-actions";

/** POST /api/admin/users/:id/comp — { tier: "starter" | "pro" | "brand" | null }. Audited. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as { tier?: unknown } | null;
  if (!body || !("tier" in body) || (body.tier !== null && typeof body.tier !== "string")) {
    return NextResponse.json({ error: 'Send { tier: "<tier id>" } or { tier: null } to revoke.' }, { status: 400 });
  }

  try {
    const after = await setComp(id, body.tier, admin.email);
    return NextResponse.json({ ok: true, ...after });
  } catch (e) {
    if (e instanceof AdminActionError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
