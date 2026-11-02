import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeUsername, usernameProblem } from "@/lib/username";


/** GET /api/me/username-check?username=foo */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("username") ?? "";
  const username = normalizeUsername(raw);
  const problem = usernameProblem(username);
  if (problem) return NextResponse.json({ available: false, error: problem });

  const existing = await prisma.user.findFirst({
    where: { username, id: { not: session.user.id } },
    select: { id: true },
  });

  return NextResponse.json(existing ? { available: false, error: "Already taken" } : { available: true });
}
