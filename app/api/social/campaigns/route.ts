import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Free brands may keep at most this many campaigns "open" at once. Paid (brand_verified) brands are uncapped. */
const FREE_BRAND_OPEN_CAMPAIGN_LIMIT = 1;

/** GET /api/social/campaigns — list open campaigns (creators) or own campaigns (brands) */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const niche = searchParams.get("niche") ?? undefined;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accountType: true },
  });

  if (user?.accountType === "brand") {
    // Brand sees their own campaigns
    const campaigns = await prisma.campaign.findMany({
      where: { brandId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { applications: true } } },
    });
    return NextResponse.json(campaigns);
  }

  // Creators see open campaigns from all brands
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "open",
      ...(niche ? { niche } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      brand: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          verifiedTier: true,
          brandProfile: { select: { companyName: true, industry: true, logoUrl: true } },
        },
      },
      _count: { select: { applications: true } },
      applications: {
        where: { creatorId: session.user.id },
        select: { status: true },
      },
    },
  });

  return NextResponse.json(campaigns);
}

/** POST /api/social/campaigns — brand creates a campaign */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accountType: true, verifiedTier: true },
  });
  if (user?.accountType !== "brand") return NextResponse.json({ error: "Brands only" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as {
    title?: string;
    description?: string;
    niche?: string;
    budget?: string;
    deadline?: string;
    status?: string;
  };

  if (!body.title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!body.description?.trim()) return NextResponse.json({ error: "Description is required" }, { status: 400 });

  const status = body.status === "draft" ? "draft" : "open";

  // Gate: free brands may only have a limited number of open campaigns at once. Drafts are unlimited.
  const isPaidBrand = user.verifiedTier === "brand_verified";
  if (status === "open" && !isPaidBrand) {
    const openCount = await prisma.campaign.count({
      where: { brandId: session.user.id, status: "open" },
    });
    if (openCount >= FREE_BRAND_OPEN_CAMPAIGN_LIMIT) {
      return NextResponse.json(
        {
          error: `Free accounts can have ${FREE_BRAND_OPEN_CAMPAIGN_LIMIT} open campaign at a time. Close an existing campaign or upgrade to run more.`,
          code: "campaign_limit_reached",
        },
        { status: 403 },
      );
    }
  }

  const campaign = await prisma.campaign.create({
    data: {
      brandId: session.user.id,
      title: body.title.trim(),
      description: body.description.trim(),
      niche: body.niche?.trim() || null,
      budget: body.budget?.trim() || null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      status,
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}
