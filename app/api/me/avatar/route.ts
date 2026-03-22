import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Keep payloads small: large TEXT updates over Neon's pooler can hit timeouts / P1017
 * ("Server has closed the connection"). ~200k chars ≈ ~150KB binary — plenty for a profile thumb.
 */
const MAX_DATA_URL_LENGTH = 200_000;

export const maxDuration = 30;

function isAllowedDataUrl(s: string): boolean {
  if (!s.startsWith("data:image/")) return false;
  const head = s.slice(0, 40).toLowerCase();
  if (!head.includes("image/jpeg") && !head.includes("image/jpg") && !head.includes("image/png") && !head.includes("image/webp")) {
    return false;
  }
  return s.includes("base64,");
}

/** POST /api/me/avatar — set profile photo from a data URL (client should resize). Body: { avatarDataUrl: string | null } */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { avatarDataUrl?: unknown };
  const raw = body.avatarDataUrl;

  if (raw === null || raw === "") {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: null },
      select: { avatarUrl: true },
    });
    return NextResponse.json({ avatarUrl: user.avatarUrl });
  }

  if (typeof raw !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (raw.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json({ error: "Image too large; try a smaller file." }, { status: 413 });
  }
  if (!isAllowedDataUrl(raw)) {
    return NextResponse.json({ error: "Only JPEG, PNG, or WebP data URLs are allowed." }, { status: 400 });
  }

  const updateOnce = () =>
    prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: raw },
      select: { avatarUrl: true },
    });

  try {
    const user = await updateOnce();
    return NextResponse.json({ avatarUrl: user.avatarUrl });
  } catch (e) {
    const isConn =
      e instanceof Prisma.PrismaClientKnownRequestError &&
      (e.code === "P1017" || e.code === "P1001");
    if (isConn) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        const user = await updateOnce();
        return NextResponse.json({ avatarUrl: user.avatarUrl });
      } catch (e2) {
        console.error("POST /api/me/avatar retry failed:", e2);
        return NextResponse.json(
          {
            error:
              "Database connection dropped (common with large images on serverless Postgres). Try again, or use a smaller photo — we compress to ~320px in the browser.",
          },
          { status: 503 }
        );
      }
    }
    throw e;
  }
}
