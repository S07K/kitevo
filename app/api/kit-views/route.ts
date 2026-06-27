import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/kit-views — kit view analytics for the logged-in user */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") ?? "30", 10) || 30, 1), 90);

  const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const prevWindowStart = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Fetch current window + previous window in one query
  const allViews = await prisma.kitView.findMany({
    where: {
      kit: { userId: session.user.id },
      viewedAt: { gte: prevWindowStart },
    },
    orderBy: { viewedAt: "desc" },
    select: {
      id: true,
      viewedAt: true,
      referrer: true,
      kit: { select: { id: true, name: true, slug: true } },
    },
  });

  const views = allViews.filter((v) => new Date(v.viewedAt) >= windowStart);
  const prevViews = allViews.filter((v) => new Date(v.viewedAt) < windowStart);

  const thisWeek = allViews.filter((v) => new Date(v.viewedAt) >= oneWeekAgo).length;
  const prevTotal = prevViews.length;
  const trend = prevTotal === 0
    ? null
    : Math.round(((views.length - prevTotal) / prevTotal) * 100);

  // Daily breakdown for the selected window
  const dailyMap: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap[d.toISOString().slice(0, 10)] = 0;
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
      try { source = new URL(v.referrer).hostname.replace(/^www\./, ""); }
      catch { source = "Direct"; }
    }
    referrerMap[source] = (referrerMap[source] ?? 0) + 1;
  }
  const referrers = Object.entries(referrerMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Per-kit breakdown
  const kitMap: Record<string, { id: string; name: string; slug: string; count: number }> = {};
  for (const v of views) {
    const k = v.kit;
    if (!kitMap[k.id]) kitMap[k.id] = { id: k.id, name: k.name, slug: k.slug, count: 0 };
    kitMap[k.id].count++;
  }
  const byKit = Object.values(kitMap).sort((a, b) => b.count - a.count);

  // Recent activity (last 20 in window)
  const recent = views.slice(0, 20);

  return NextResponse.json({
    views: recent,
    thisWeek,
    daily,
    referrers,
    byKit,
    total: views.length,
    trend,
    days,
  });
}
