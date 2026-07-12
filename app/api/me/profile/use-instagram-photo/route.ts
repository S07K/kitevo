import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstagramProfilePictureForUser } from "@/lib/instagram-api";
import { fetchImageAsDataUrl } from "@/lib/image-to-data-url";

export const maxDuration = 30;

/**
 * POST /api/me/profile/use-instagram-photo — set avatar from the user's Instagram
 * profile picture (requires connected IG).
 *
 * Instagram profile-picture URLs are signed CDN links (scontent.*.fbcdn.net) that
 * expire after a few hours, so we download the image now and persist the bytes as a
 * base64 data URL. The avatar then stays fixed until the user changes it — it never
 * silently breaks when the signature lapses.
 */
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

  let dataUrl: string;
  try {
    dataUrl = await fetchImageAsDataUrl(url);
  } catch (e) {
    console.error("[use-instagram-photo] Failed to fetch/encode IG photo:", e);
    return NextResponse.json(
      { error: "Couldn't import your Instagram photo. Please upload a photo instead." },
      { status: 502 }
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: dataUrl },
    select: { avatarUrl: true },
  });

  return NextResponse.json({ avatarUrl: user.avatarUrl });
}
