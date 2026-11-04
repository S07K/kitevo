import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET — who claimed this product (newest first). Owner only. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const product = await prisma.product.findFirst({ where: { id, userId: session.user.id }, select: { id: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const orders = await prisma.order.findMany({
    where: { productId: id, status: { in: ["free", "paid"] } }, // abandoned checkouts are not buyers
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, buyerEmail: true, buyerName: true, status: true, createdAt: true, booking: { select: { startsAt: true } } },
  });
  return NextResponse.json(orders);
}
