/**
 * Campaign view analytics — record and query views for the brand campaigns dashboard.
 * Owner (brand) views are excluded by the caller so counts reflect real creator interest.
 */

import { prisma } from "@/lib/prisma";

/** Record a view for a campaign (public campaign detail page). Never throws. */
export async function recordCampaignView(
  campaignId: string,
  opts?: { viewerId?: string | null; referrer?: string | null }
): Promise<void> {
  try {
    await prisma.campaignView.create({
      data: {
        campaignId,
        viewerId: opts?.viewerId ?? undefined,
        referrer: opts?.referrer ?? undefined,
      },
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[recordCampaignView] skipped:", e);
    }
  }
}

/** Total and unique-viewer counts per campaign. Returns maps keyed by campaignId (0-filled). */
export async function getCampaignViewCounts(
  campaignIds: string[]
): Promise<{ total: Record<string, number>; unique: Record<string, number> }> {
  const total: Record<string, number> = {};
  const unique: Record<string, number> = {};
  for (const id of campaignIds) { total[id] = 0; unique[id] = 0; }
  if (campaignIds.length === 0) return { total, unique };

  try {
    const totals = await prisma.campaignView.groupBy({
      by: ["campaignId"],
      where: { campaignId: { in: campaignIds } },
      _count: { id: true },
    });
    for (const r of totals) total[r.campaignId] = r._count.id;

    // Unique logged-in viewers (anonymous views have viewerId null and are excluded from "unique").
    const uniques = await prisma.campaignView.groupBy({
      by: ["campaignId", "viewerId"],
      where: { campaignId: { in: campaignIds }, viewerId: { not: null } },
    });
    for (const r of uniques) unique[r.campaignId] = (unique[r.campaignId] ?? 0) + 1;
  } catch (e) {
    console.error("getCampaignViewCounts error:", e);
  }
  return { total, unique };
}
