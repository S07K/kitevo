import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Capture the id: narrowing on session.user.id is lost inside the upsert closure below.
  const userId = session.user.id;

  const body = (await req.json().catch(() => ({}))) as { logoDataUrl?: unknown };
  const raw = body.logoDataUrl;

  if (raw === null || raw === "") {
    const bp = await prisma.brandProfile.upsert({
      where: { userId },
      create: { userId, logoUrl: null, companyName: "", industry: "", budgetRange: "" },
      update: { logoUrl: null },
      select: { logoUrl: true },
    });
    return NextResponse.json({ logoUrl: bp.logoUrl });
  }

  if (typeof raw !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (raw.length > MAX_DATA_URL_LENGTH) {
    return NextResponse.json({ error: "Image too large; try a smaller file." }, { status: 413 });
  }
  if (!isAllowedDataUrl(raw)) {
    return NextResponse.json({ error: "Only JPEG, PNG, or WebP images are allowed." }, { status: 400 });
  }

  const upsertLogo = () =>
    prisma.brandProfile.upsert({
      where: { userId },
      create: { userId, logoUrl: raw, companyName: "", industry: "", budgetRange: "" },
      update: { logoUrl: raw },
      select: { logoUrl: true },
    });

  try {
    const bp = await upsertLogo();
    return NextResponse.json({ logoUrl: bp.logoUrl });
  } catch (e) {
    const isConn =
      e instanceof Prisma.PrismaClientKnownRequestError &&
      (e.code === "P1017" || e.code === "P1001");
    if (isConn) {
      await new Promise((r) => setTimeout(r, 400));
      try {
        const bp = await upsertLogo();
        return NextResponse.json({ logoUrl: bp.logoUrl });
      } catch (e2) {
        console.error("POST /api/brand/logo retry failed:", e2);
        return NextResponse.json({ error: "Upload failed, try a smaller image." }, { status: 503 });
      }
    }
    throw e;
  }
}
