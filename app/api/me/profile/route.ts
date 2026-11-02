import { NextResponse } from "next/server";
import { normalizeLinks, MAX_LOCATION } from "@/lib/profile-links";
import { CREATOR_NICHES, MAX_NICHES } from "@/lib/niches";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeUsername, usernameProblem } from "@/lib/username";

export type ProfileLink = { label: string; url: string };

export type ProfilePayload = {
  name: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  verifiedTier?: string | null;
  links: ProfileLink[];
  niches?: string[];
  location?: string | null;
};

function parseLinks(linksJson: string | null): ProfileLink[] {
  if (!linksJson) return [];
  try {
    const parsed = JSON.parse(linksJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is ProfileLink =>
        typeof x === "object" && x !== null && typeof (x as ProfileLink).label === "string" && typeof (x as ProfileLink).url === "string"
    );
  } catch {
    return [];
  }
}

/** GET /api/me/profile — current user's creator profile */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      avatarUrl: true,
      links: true,
      niches: true,
      location: true,
      email: true,
      onboardingCompletedAt: true,
      instagramUserId: true,
      accountType: true,
      verifiedTier: true,
      brandProfile: { select: { companyName: true, logoUrl: true } },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const displayName = user.accountType === "brand" && user.brandProfile?.companyName
    ? user.brandProfile.companyName
    : user.name;

  const avatarUrl = user.accountType === "brand"
    ? (user.brandProfile?.logoUrl ?? user.avatarUrl)
    : user.avatarUrl;

  return NextResponse.json({
    id: user.id,
    name: displayName,
    username: user.username,
    bio: user.bio,
    avatarUrl,
    email: user.email,
    links: parseLinks(user.links),
    niches: user.niches ? (JSON.parse(user.niches) as string[]) : [],
    location: user.location ?? null,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    instagramConnected: !!user.instagramUserId,
    accountType: user.accountType,
    verifiedTier: user.verifiedTier,
  });
}

/** PUT /api/me/profile — update creator profile */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Partial<ProfilePayload>;
  const username = typeof body.username === "string" ? normalizeUsername(body.username) : undefined;
  if (username !== undefined && username.length > 0) {
    // Validate only a *changed* username, so users who already hold one that is now
    // reserved can still save the rest of their profile.
    const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { username: true } });
    const problem = current?.username === username ? null : usernameProblem(username);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    const existing = await prisma.user.findFirst({
      where: { username, id: { not: session.user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }
  }
  // Links render as <a href> on public kits: only web and email URLs are kept (lib/profile-links).
  const linksJson = Array.isArray(body.links) ? JSON.stringify(normalizeLinks(body.links)) : undefined;
  const nichesJson =
    Array.isArray(body.niches)
      ? JSON.stringify(
          [...new Set(body.niches.filter((n): n is string => typeof n === "string" && (CREATOR_NICHES as readonly string[]).includes(n)))].slice(0, MAX_NICHES),
        )
      : undefined;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(typeof body.name === "string" && { name: body.name.trim() || null }),
      ...(username !== undefined && { username: username || null }),
      ...(typeof body.bio === "string" && { bio: body.bio.trim().slice(0, 500) || null }),
      ...(typeof body.location === "string" && { location: body.location.trim().slice(0, MAX_LOCATION) || null }),
      ...(typeof body.avatarUrl === "string" && { avatarUrl: body.avatarUrl.trim() || null }),
      ...(linksJson !== undefined && { links: linksJson }),
      ...(nichesJson !== undefined && { niches: nichesJson }),
    },
    select: { name: true, username: true, bio: true, avatarUrl: true, links: true, niches: true, location: true },
  });
  return NextResponse.json({
    name: user.name,
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    links: parseLinks(user.links),
    niches: user.niches ? (JSON.parse(user.niches) as string[]) : [],
    location: user.location ?? null,
  });
}
