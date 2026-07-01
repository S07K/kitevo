import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      accountType: true,
      niches: true,
      openToCollab: true,
      location: true,
      verifiedTier: true,
      brandProfile: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    accountType: user.accountType,
    niches: user.niches ? (JSON.parse(user.niches) as string[]) : [],
    openToCollab: user.openToCollab,
    location: user.location,
    verifiedTier: user.verifiedTier,
    brandProfile: user.brandProfile,
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    accountType?: string;
    niches?: string[];
    openToCollab?: boolean;
    location?: string;
  };

  const accountType = body.accountType === "brand" ? "brand" : "creator";

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      accountType,
      ...(Array.isArray(body.niches) && { niches: JSON.stringify(body.niches) }),
      ...(typeof body.openToCollab === "boolean" && { openToCollab: body.openToCollab }),
      ...(typeof body.location === "string" && { location: body.location.trim() || null }),
    },
  });

  return NextResponse.json({ ok: true });
}
