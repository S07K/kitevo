import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/social/campaigns/[id] — public campaign detail */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      brand: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          brandProfile: { select: { companyName: true, industry: true, logoUrl: true, website: true, description: true } },
        },
      },
      _count: { select: { applications: true } },
    },
  });
  if (!campaign || campaign.status !== "open") return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
}

/** PATCH /api/social/campaigns/[id] — brand updates status (open/closed/draft) */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { brandId: true } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.brandId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { status?: string };
  const updated = await prisma.campaign.update({
    where: { id },
    data: { status: body.status ?? undefined },
  });
  return NextResponse.json(updated);
}

/** DELETE /api/social/campaigns/[id] — brand deletes campaign */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { brandId: true } });
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.brandId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
