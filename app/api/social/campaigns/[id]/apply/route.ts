import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST /api/social/campaigns/[id]/apply — creator applies to a campaign */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accountType: true },
  });
  if (user?.accountType === "brand") return NextResponse.json({ error: "Creators only" }, { status: 403 });

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { status: true } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status !== "open") return NextResponse.json({ error: "Campaign is not open" }, { status: 400 });

  const body = await req.json().catch(() => ({})) as { message?: string };

  const existing = await prisma.campaignApplication.findUnique({
    where: { campaignId_creatorId: { campaignId: id, creatorId: session.user.id } },
  });
  if (existing) return NextResponse.json({ error: "Already applied" }, { status: 409 });

  const application = await prisma.campaignApplication.create({
    data: {
      campaignId: id,
      creatorId: session.user.id,
      message: body.message?.trim() || null,
      status: "pending",
    },
  });

  return NextResponse.json(application, { status: 201 });
}
