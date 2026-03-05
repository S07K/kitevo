import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ProfileLink = { label: string; url: string };

export type ProfilePayload = {
  name: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  links: ProfileLink[];
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
    select: { name: true, username: true, bio: true, avatarUrl: true, links: true, email: true, onboardingCompletedAt: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({
    name: user.name,
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    email: user.email,
    links: parseLinks(user.links),
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
  });
}

/** PUT /api/me/profile — update creator profile */
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Partial<ProfilePayload>;
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase().replace(/\s+/g, "-") : undefined;
  if (username !== undefined && username.length > 0) {
    const existing = await prisma.user.findFirst({
      where: { username, id: { not: session.user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }
  }
  const linksJson =
    Array.isArray(body.links) ?
      JSON.stringify(
        body.links
          .filter((x) => x && typeof x.label === "string" && typeof x.url === "string")
          .map((x) => ({ label: x.label, url: x.url }))
      )
    : undefined;
  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(typeof body.name === "string" && { name: body.name.trim() || null }),
      ...(username !== undefined && { username: username || null }),
      ...(typeof body.bio === "string" && { bio: body.bio.trim() || null }),
      ...(typeof body.avatarUrl === "string" && { avatarUrl: body.avatarUrl.trim() || null }),
      ...(linksJson !== undefined && { links: linksJson }),
    },
    select: { name: true, username: true, bio: true, avatarUrl: true, links: true },
  });
  return NextResponse.json({
    name: user.name,
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    links: parseLinks(user.links),
  });
}
