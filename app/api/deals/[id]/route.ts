import { NextResponse } from "next/server";
import { dealForViewer, publicDeal } from "@/lib/deal-access";
import { payOptions } from "@/lib/deal-payments";
import { dealState } from "@/lib/deals";

export const dynamic = "force-dynamic";

/** GET ?token= — a deal, for its creator, its brand account, or the brand's private link. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const v = await dealForViewer(id, new URL(req.url).searchParams.get("token"));
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { current } = dealState(v.deal);
  const payWith = current ? await payOptions(v.deal.creatorId, current.currency) : [];
  return NextResponse.json({ ...publicDeal(v.deal, v.role), payWith }, { headers: { "Cache-Control": "private, no-store" } });
}
