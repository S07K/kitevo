import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendApplicationDecisionEmail } from "@/lib/email";
import { inBackground } from "@/lib/background";

/** GET /api/social/campaigns/[id]/applications — brand sees who applied */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { brandId: true } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.brandId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const applications = await prisma.campaignApplication.findMany({
    where: { campaignId: id },
    orderBy: { createdAt: "asc" },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          bio: true,
          niches: true,
          verifiedTier: true,
          kits: { where: { passwordHash: null }, take: 1, select: { slug: true } },
        },
      },
    },
  });

  return NextResponse.json(applications);
}

/** PATCH /api/social/campaigns/[id]/applications — brand accepts/rejects an application */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { brandId: true, title: true, brand: { select: { name: true, brandProfile: { select: { companyName: true } } } } },
  });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.brandId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { applicationId?: string; status?: string };
  if (!body.applicationId) return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  if (!["accepted", "rejected", "pending"].includes(body.status ?? "")) {
    return NextResponse.json({ error: "status must be accepted, rejected, or pending" }, { status: 400 });
  }

  // The application must belong to THIS campaign. Owning the campaign in the URL is not
  // enough: without this check a brand could change applications on other brands' campaigns.
  const current = await prisma.campaignApplication.findFirst({
    where: { id: body.applicationId, campaignId: id },
    select: { status: true, creator: { select: { email: true } } },
  });
  if (!current) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const updated = await prisma.campaignApplication.update({
    where: { id: body.applicationId },
    data: { status: body.status! },
  });

  // Email the creator only when the decision actually changes (no repeat emails on re-clicks;
  // moving back to "pending" is silent).
  const decision = body.status === "accepted" || body.status === "rejected" ? body.status : null;
  const creatorEmail = current.creator?.email;
  if (decision && current.status !== decision && creatorEmail) {
    inBackground("application-decision", () =>
      sendApplicationDecisionEmail({
        creatorEmail,
        campaignId: id,
        campaignTitle: campaign.title,
        brandName: campaign.brand?.brandProfile?.companyName || campaign.brand?.name || "The brand",
        decision,
      }),
    );
  }
  return NextResponse.json(updated);
}
