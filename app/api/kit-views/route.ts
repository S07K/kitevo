import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/kit-views — kit view analytics for the logged-in user */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const views = await prisma.kitView.findMany({
    where: {
      kit: { userId: session.user.id },
      viewedAt: { gte: thirtyDaysAgo },
    },
    orderBy: { viewedAt: "desc" },
    select: {
      id: true,
      viewedAt: true,
      referrer: true,
      kit: { select: { id: true, name: true, slug: true } },
    },
  });

  const thisWeek = views.filter((v) => new Date(v.viewedAt) >= oneWeekAgo).length;

  // Build daily breakdown for the last 30 days
  const dailyMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = 0;
  }
  for (const v of views) {
    const key = new Date(v.viewedAt).toISOString().slice(0, 10);
    if (key in dailyMap) dailyMap[key]++;
  }
  const daily = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));

  // Referrer breakdown
  const referrerMap: Record<string, number> = {};
  for (const v of views) {
    let source = "Direct";
    if (v.referrer) {
      try {
        source = new URL(v.referrer).hostname.replace(/^www\./, "");
      } catch {
        source = "Direct";
      }
    }
    referrerMap[source] = (referrerMap[source] ?? 0) + 1;
  }
  const referrers = Object.entries(referrerMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Recent activity (last 20)
  const recent = views.slice(0, 20);

  return NextResponse.json({ views: recent, thisWeek, daily, referrers, total: views.length });
}
