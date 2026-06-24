import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstagramProfilePictureForUser } from "@/lib/instagram-api";

/** POST /api/me/profile/use-instagram-photo — copy Instagram profile picture URL to avatar (requires connected IG). */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = await getInstagramProfilePictureForUser(session.user.id);
  if (!url) {
    return NextResponse.json(
      { error: "Could not load Instagram profile photo. Connect Instagram or try uploading a photo." },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: url },
    select: { avatarUrl: true },
  });

  return NextResponse.json({ avatarUrl: user.avatarUrl });
}
