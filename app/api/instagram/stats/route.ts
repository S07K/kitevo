import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStatsForUser } from "@/lib/instagram-api";
import { prisma } from "@/lib/prisma";

/** GET /api/instagram/stats — real stats if connected, null if not. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { instagramUserId: true, instagramAccessToken: true },
  });

  if (!user?.instagramUserId || !user?.instagramAccessToken) {
    return NextResponse.json(null);
  }

  try {
    const stats = await getStatsForUser(session.user.id);
    return NextResponse.json(stats);
  } catch (e) {
    console.error("Instagram stats error:", e);
    return NextResponse.json(null);
  }
}
