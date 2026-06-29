import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getYouTubeStatsForUser } from "@/lib/youtube-api";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const stats = await getYouTubeStatsForUser(session.user.id);
  return NextResponse.json(stats);
}
