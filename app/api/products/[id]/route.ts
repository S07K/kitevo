import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeProductInput } from "@/lib/commerce";
import { trackEvent } from "@/lib/analytics";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

async function own(ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { id } = await ctx.params;
  const product = await prisma.product.findFirst({ where: { id, userId: session.user.id } });
  if (!product) return { error: NextResponse.json({ error: "Product not found" }, { status: 404 }) };
  return { product };
}

/** PUT — update a product; `position` alone reorders it. */
export async function PUT(req: Request, ctx: Ctx) {
  const r = await own(ctx);
  if (r.error) return r.error;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (Object.keys(body).length === 1 && typeof body.position === "number") {
    const updated = await prisma.product.update({ where: { id: r.product.id }, data: { position: Math.max(0, Math.floor(body.position)) } });
    return NextResponse.json(updated);
  }
  const parsed = normalizeProductInput({ ...r.product, ...body });
  if (!parsed.ok) return NextResponse.json({ error: parsed.problem.error, field: parsed.problem.field }, { status: 400 });
  const updated = await prisma.product.update({ where: { id: r.product.id }, data: parsed.value });
  if (r.product.status !== "published" && updated.status === "published") {
    void trackEvent("product_published", { userId: updated.userId, props: { productId: updated.id }, dedupeKey: `product_published:${updated.id}` });
  }
  return NextResponse.json(updated);
}

/** DELETE — remove a product and its claims. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const r = await own(ctx);
  if (r.error) return r.error;
  await prisma.product.delete({ where: { id: r.product.id } });
  return NextResponse.json({ ok: true });
}
