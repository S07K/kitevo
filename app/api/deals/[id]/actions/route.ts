import { NextResponse } from "next/server";
import { dealForViewer, publicDeal } from "@/lib/deal-access";
import { normalizeQuote } from "@/lib/deals-shared";
import { cancel, DealError, markDelivered, proposeVersion, respond, withdraw } from "@/lib/deals";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** POST { action, quote?, token? } — accept | decline | propose | withdraw | cancel | deliver. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: unknown; quote?: unknown; token?: unknown };
  if (!rateLimit(`deal-action:${clientIp(req)}`, 30, 10 * 60 * 1000).ok) return NextResponse.json({ error: "Too many changes. Wait a moment." }, { status: 429 });
  const v = await dealForViewer(id, typeof body.token === "string" ? body.token : null);
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    let deal;
    switch (body.action) {
      case "accept":
      case "decline":
        deal = await respond(id, v.role, body.action);
        break;
      case "propose": {
        const q = normalizeQuote(body.quote);
        if (!q.ok) return NextResponse.json({ error: q.error, field: q.field }, { status: 400 });
        deal = await proposeVersion(id, v.role, q.value);
        break;
      }
      case "withdraw":
        deal = await withdraw(id, v.role);
        break;
      case "cancel":
        deal = await cancel(id, v.role);
        break;
      case "deliver":
        deal = await markDelivered(id, v.role);
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    return NextResponse.json(publicDeal(deal, v.role));
  } catch (e) {
    if (e instanceof DealError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
