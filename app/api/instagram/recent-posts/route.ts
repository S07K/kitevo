import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRecentPostsForUser } from "@/lib/instagram-api";

/** GET /api/instagram/recent-posts — current user's recent Instagram posts (or mock if not connected). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const posts = await getRecentPostsForUser(session.user.id);
    return NextResponse.json(posts);
  } catch (e) {
    console.error("Instagram recent-posts error:", e);
    return NextResponse.json({ error: "Failed to load posts" }, { status: 500 });
  }
}
