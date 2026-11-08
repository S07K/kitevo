import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateSuggestion } from "@/lib/copilot";

export const dynamic = "force-dynamic";

/**
 * GET ?kitId= — a rate card suggested from the kit's own numbers with the rate calculator's
 * formulas (no AI, so every plan and no usage counted). { items, basis } or { items: [] }.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, accountType: true } });
  if (!u || u.accountType === "brand") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const kitId = new URL(req.url).searchParams.get("kitId");
  const s = await rateSuggestion(u.id, kitId && kitId.length <= 64 ? kitId : null);
  return NextResponse.json(s ?? { items: [], basis: [] });
}
