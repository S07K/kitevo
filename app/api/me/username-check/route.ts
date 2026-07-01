import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const RESERVED = new Set([
  "dashboard", "login", "signup", "pricing", "kit", "api", "profile",
  "onboarding", "help", "privacy", "terms", "forgot-password", "reset-password",
  "components", "favicon.ico", "robots.txt", "sitemap.xml", "brand", "social",
]);

/** GET /api/me/username-check?username=foo */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("username") ?? "";
  const username = raw.trim().toLowerCase().replace(/\s+/g, "-");

  if (!username) return NextResponse.json({ available: false, error: "Enter a username" });
  if (!/^[a-z0-9-]+$/.test(username)) return NextResponse.json({ available: false, error: "Only letters, numbers, and hyphens" });
  if (username.length < 2) return NextResponse.json({ available: false, error: "At least 2 characters" });
  if (RESERVED.has(username)) return NextResponse.json({ available: false, error: "That username is reserved" });

  const existing = await prisma.user.findFirst({
    where: { username, id: { not: session.user.id } },
    select: { id: true },
  });

  return NextResponse.json(existing ? { available: false, error: "Already taken" } : { available: true });
}
