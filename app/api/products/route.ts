import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_PRODUCTS, normalizeProductInput, paidPublishProblem } from "@/lib/commerce";
import { MediaError, resolveCover } from "@/lib/media-storage";

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
    // Old booking products are retired (moved to the kit's Book a call); only downloads list.
    where: { userId, type: "download" },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { orders: { where: { status: { in: ["free", "paid"] } } } } } },
  });
  return NextResponse.json(
    rows.map(({ _count, ...p }) => ({ ...p, orders: _count.orders })),
  );
}

/** POST — create a product (starts as a draft unless it's complete and published). */
export async function POST(req: Request) {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const count = await prisma.product.count({ where: { userId, type: "download" } });
  if (count >= MAX_PRODUCTS) return NextResponse.json({ error: `You can have up to ${MAX_PRODUCTS} products.` }, { status: 400 });
  const parsed = normalizeProductInput(await req.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: parsed.problem.error, field: parsed.problem.field }, { status: 400 });
  const blocked = await paidPublishProblem(userId, parsed.value);
  if (blocked) return NextResponse.json({ ...blocked, field: "priceCents" }, { status: 403 });
  let coverUrl: string | null;
  try {
    coverUrl = await resolveCover(parsed.value.coverUrl);
  } catch (e) {
    if (e instanceof MediaError) return NextResponse.json({ error: e.message, field: "coverUrl" }, { status: 502 });
    throw e;
  }
  const product = await prisma.product.create({ data: { ...parsed.value, coverUrl, userId, position: count } });
  return NextResponse.json({ ...product, orders: 0 }, { status: 201 });
}
