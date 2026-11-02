import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { usernameBase, usernameCandidates } from "@/lib/username";

/**
 * GET /api/me/username-suggest — the first free username derived from the signed-in
 * user's name (or email). Returns their current username if they already have one.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { username: true, name: true, email: true } });
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (me.username) return NextResponse.json({ username: me.username });

  const candidates = usernameCandidates(usernameBase(me.name || me.email), 8);
  const taken = new Set(
    (await prisma.user.findMany({ where: { username: { in: candidates } }, select: { username: true } })).map((u) => u.username)
  );
  return NextResponse.json({ username: candidates.find((c) => !taken.has(c)) ?? null });
}
