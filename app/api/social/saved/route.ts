import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Shared select + serializer so saved creators render exactly like discover cards. */
const creatorSelect = {
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
} as const;

type CreatorRow = {
  id: string; name: string | null; username: string | null; bio: string | null;
  avatarUrl: string | null; niches: string | null; openToCollab: boolean;
  location: string | null; verifiedTier: string | null; instagramUserId: string | null;
  followerCount: number | null; engagementRate: number | null;
  kits: { id: string; slug: string; name: string }[];
};

function serialize(u: CreatorRow) {
  return {
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
  };
}

async function requireBrand(): Promise<{ userId: string } | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { accountType: true } });
  if (user?.accountType !== "brand") return NextResponse.json({ error: "Brands only" }, { status: 403 });
  return { userId: session.user.id };
}

/** GET /api/social/saved — list creators this brand has saved (shortlist). */
export async function GET() {
  const auth = await requireBrand();
  if (auth instanceof NextResponse) return auth;

  const saved = await prisma.savedCreator.findMany({
    where: { brandId: auth.userId },
    orderBy: { createdAt: "desc" },
    select: { creator: { select: creatorSelect } },
  });

  return NextResponse.json({ items: saved.map((s) => serialize(s.creator)) });
}

/** POST /api/social/saved { creatorId } — add a creator to the shortlist (idempotent). */
export async function POST(req: Request) {
  const auth = await requireBrand();
  if (auth instanceof NextResponse) return auth;

  const { creatorId } = (await req.json().catch(() => ({}))) as { creatorId?: string };
  if (!creatorId) return NextResponse.json({ error: "creatorId required" }, { status: 400 });
  if (creatorId === auth.userId) return NextResponse.json({ error: "Cannot save yourself" }, { status: 400 });

  await prisma.savedCreator.upsert({
    where: { brandId_creatorId: { brandId: auth.userId, creatorId } },
    create: { brandId: auth.userId, creatorId },
    update: {},
  });

  return NextResponse.json({ saved: true });
}

/** DELETE /api/social/saved { creatorId } — remove a creator from the shortlist. */
export async function DELETE(req: Request) {
  const auth = await requireBrand();
  if (auth instanceof NextResponse) return auth;

  const { creatorId } = (await req.json().catch(() => ({}))) as { creatorId?: string };
  if (!creatorId) return NextResponse.json({ error: "creatorId required" }, { status: 400 });

  await prisma.savedCreator.deleteMany({ where: { brandId: auth.userId, creatorId } });

  return NextResponse.json({ saved: false });
}
