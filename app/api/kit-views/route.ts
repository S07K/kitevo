import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/kit-views — recent kit views for the logged-in user's kits */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const views = await prisma.kitView.findMany({
    where: { kit: { userId: session.user.id } },
    orderBy: { viewedAt: "desc" },
    take: 50,
    select: {
      id: true,
      viewedAt: true,
      referrer: true,
      kit: { select: { id: true, name: true, slug: true } },
    },
  });

  // Views this week for summary stat
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = views.filter((v) => new Date(v.viewedAt) >= oneWeekAgo).length;

  return NextResponse.json({ views, thisWeek });
}
