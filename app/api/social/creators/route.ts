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
    kit: u.kits[0] ?? null,
  }));

  return NextResponse.json({ items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null });
}
