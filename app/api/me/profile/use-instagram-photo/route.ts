import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInstagramProfilePictureForUser } from "@/lib/instagram-api";

export const maxDuration = 30;

/**
 * Instagram profile-picture URLs are signed CDN links (scontent.*.fbcdn.net) that
 * expire after a few hours, so storing the raw URL leaves a broken <img> once the
 * signature lapses. Instead we fetch the image server-side and persist it as a base64
 * data URL — the same durable format used by /api/me/avatar. ~200k chars keeps large
 * TEXT updates comfortably under Neon pooler timeouts (a 150px IG thumb is far smaller).
 */
const MAX_DATA_URL_LENGTH = 200_000;
const ALLOWED_MIME = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/** POST /api/me/profile/use-instagram-photo — copy Instagram profile picture to avatar as a durable data URL (requires connected IG). */
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

  // Download the (still-valid) signed URL now and store the bytes so it never expires.
  let dataUrl: string;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Instagram CDN responded ${res.status}`);
    const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_MIME.includes(mime)) {
      throw new Error(`Unexpected image type: ${mime || "unknown"}`);
    }
    const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    dataUrl = `data:${mime};base64,${base64}`;
    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      throw new Error("Instagram photo is too large to store");
    }
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
