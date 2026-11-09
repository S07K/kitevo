import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { activeGuard, blockedGuard } from "@/lib/safety";
import { sendApplicationReceivedEmail } from "@/lib/email";
import { inBackground } from "@/lib/background";

/** GET /api/social/campaigns/[id]/apply — check if current user already applied */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json(null);

  const { id } = await params;
  const existing = await prisma.campaignApplication.findUnique({
    where: { campaignId_creatorId: { campaignId: id, creatorId: session.user.id } },
    select: { status: true },
  });
  return NextResponse.json(existing ?? null);
}

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
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { status: true, title: true, brandId: true, brand: { select: { email: true, suspendedAt: true } } },
  });
  if (!campaign || campaign.brand.suspendedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status !== "open") return NextResponse.json({ error: "Campaign is not open" }, { status: 400 });
  const stop = (await activeGuard(session.user.id)) ?? (await blockedGuard(session.user.id, campaign.brandId));
  if (stop) return stop;

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

  // Tell the brand, after the response (an email problem must never fail the application).
  const brandEmail = campaign.brand?.email;
  if (brandEmail) {
    inBackground("application-received", async () => {
      const creator = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, username: true } });
      await sendApplicationReceivedEmail({
        brandEmail,
        campaignTitle: campaign.title,
        creator: { name: creator?.name || creator?.username || "A creator", username: creator?.username ?? null },
        pitch: application.message,
      });
    });
  }

  return NextResponse.json(application, { status: 201 });
}
