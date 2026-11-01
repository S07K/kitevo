import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin-actions";
import { replayWebhookEvent } from "@/lib/webhook-log";

/** POST /api/admin/webhooks/:id/replay — re-apply a logged delivery's stored event. Audited. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { id } = await params;

  const result = await replayWebhookEvent(id);
  if (!result) return NextResponse.json({ error: "Nothing to replay for this delivery." }, { status: 409 });

  await logAdminAction(admin.email, "webhook.replay", null, { webhookEventId: id, result });
  return NextResponse.json({ ok: result.status !== "failed", ...result });
}
