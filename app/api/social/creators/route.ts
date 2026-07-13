import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const niche = searchParams.get("niche");
  const search = searchParams.get("q");
  const cursor = searchParams.get("cursor");
  const limit = 24;

  // Advanced filters (follower/engagement range) are a Brand Pro feature — only applied for verified brands.
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { verifiedTier: true } });
  const isPro = me?.verifiedTier === "brand_verified";
  const minFollowers = isPro ? Number.parseInt(searchParams.get("minFollowers") ?? "", 10) : NaN;
  const maxFollowers = isPro ? Number.parseInt(searchParams.get("maxFollowers") ?? "", 10) : NaN;
  const minEngagement = isPro ? Number.parseFloat(searchParams.get("minEngagement") ?? "") : NaN;
  const hasFollowerFilter = Number.isFinite(minFollowers) || Number.isFinite(maxFollowers);

  const users = await prisma.user.findMany({
    where: {
      accountType: "creator",
      id: { not: session.user.id },
      onboardingCompletedAt: { not: null },
      // only creators who've set a username (i.e. have a public profile)
      username: { not: null },
      ...(niche && {
        niches: { contains: niche },
      }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { username: { contains: search, mode: "insensitive" } },
          { bio: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...(hasFollowerFilter && {
        followerCount: {
          ...(Number.isFinite(minFollowers) ? { gte: minFollowers } : {}),
          ...(Number.isFinite(maxFollowers) ? { lte: maxFollowers } : {}),
        },
      }),
      ...(Number.isFinite(minEngagement) && { engagementRate: { gte: minEngagement } }),
      ...(cursor && { id: { lt: cursor } }),
    },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      avatarUrl: true,
      niches: true,
      openToCollab: true,
      location: true,
      verifiedTier: true,
      instagramUserId: true,
      followerCount: true,
      engagementRate: true,
      kits: {
        where: { passwordHash: null },
        select: { id: true, slug: true, name: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = users.length > limit;
  const items = users.slice(0, limit).map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    bio: u.bio,
    avatarUrl: u.avatarUrl,
    niches: u.niches ? (JSON.parse(u.niches) as string[]) : [],
    openToCollab: u.openToCollab,
    location: u.location,
    verifiedTier: u.verifiedTier,
    hasInstagram: !!u.instagramUserId,
    followerCount: u.followerCount,
    engagementRate: u.engagementRate,
    kit: u.kits[0] ?? null,
  }));

  return NextResponse.json({ items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null });
}
