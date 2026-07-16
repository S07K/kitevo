import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidatePlatformCache } from "@/lib/platform-cache";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      youtubeChannelId: null,
      youtubeAccessToken: null,
      youtubeRefreshToken: null,
      youtubeTokenExpiresAt: null,
    },
  });
  invalidatePlatformCache(session.user.id);
  return NextResponse.json({ ok: true });
}
