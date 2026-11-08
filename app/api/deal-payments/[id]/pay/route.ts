import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dealForViewer } from "@/lib/deal-access";
import { startDealPayment } from "@/lib/deal-payments";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** POST { provider?, token? } — the brand starts paying one of the deal's payments. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { provider?: unknown; token?: unknown };
  if (!rateLimit(`deal-pay:${clientIp(req)}`, 10, 10 * 60 * 1000).ok) return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  const pay = await prisma.dealPayment.findUnique({ where: { id }, select: { dealId: true } });
  const v = pay && (await dealForViewer(pay.dealId, typeof body.token === "string" ? body.token : null));
  if (!v || v.role !== "brand") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const r = await startDealPayment(id, typeof body.provider === "string" ? body.provider : null);
  if (r.kind === "error") return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r);
}
