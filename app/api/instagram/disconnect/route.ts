import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST /api/instagram/disconnect — clear Instagram connection for current user. */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { instagramUserId: null, instagramAccessToken: null },
  });
  return NextResponse.json({ ok: true });
}
