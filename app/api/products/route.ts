import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_PRODUCTS, normalizeProductInput } from "@/lib/commerce";

export const dynamic = "force-dynamic";

async function creatorId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, accountType: true } });
  return u && u.accountType !== "brand" ? u.id : null;
}

/** GET — the creator's products with how many people claimed each. */
export async function GET() {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.product.findMany({
    where: { userId },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { orders: true } } },
  });
  return NextResponse.json(
    rows.map(({ _count, ...p }) => ({ ...p, orders: _count.orders })),
  );
}

/** POST — create a product (starts as a draft unless it's complete and published). */
export async function POST(req: Request) {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const count = await prisma.product.count({ where: { userId } });
  if (count >= MAX_PRODUCTS) return NextResponse.json({ error: `You can have up to ${MAX_PRODUCTS} products.` }, { status: 400 });
  const parsed = normalizeProductInput(await req.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: parsed.problem.error, field: parsed.problem.field }, { status: 400 });
  const product = await prisma.product.create({ data: { ...parsed.value, userId, position: count } });
  return NextResponse.json({ ...product, orders: 0 }, { status: 201 });
}
