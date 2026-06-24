import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStatsForUser } from "@/lib/instagram-api";

/** GET /api/instagram/stats — current user's Instagram stats (or mock if not connected). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const stats = await getStatsForUser(session.user.id);
    return NextResponse.json(stats);
  } catch (e) {
    console.error("Instagram stats error:", e);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
