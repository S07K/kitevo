import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getRecentPostsForUser } from "@/lib/instagram-api";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const posts = await getRecentPostsForUser(session.user.id);
  return NextResponse.json(posts);
}
