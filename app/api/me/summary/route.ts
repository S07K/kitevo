import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { workspaceSummary } from "@/lib/workspace-summary";

export const dynamic = "force-dynamic";

/** GET — the creator dashboard's summary: deals, products, inquiries, setup (lib/workspace-summary). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { accountType: true } });
  if (!u || u.accountType === "brand") return NextResponse.json({ error: "Creators only" }, { status: 403 });
  return NextResponse.json(await workspaceSummary(session.user.id));
}
