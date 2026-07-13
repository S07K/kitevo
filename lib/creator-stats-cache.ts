/**
 * Cached creator stats for discover filtering.
 *
 * Follower/engagement numbers come live from Instagram/YouTube, which is too slow to
 * query per-creator while filtering. We snapshot them onto User (followerCount,
 * engagementRate, statsUpdatedAt) and filter against the cache. Refreshed by:
 *   - the backfill/cron script (scripts/refresh-creator-stats.ts) for coverage, and
 *   - writeInstagramStatsCache(), called opportunistically when live IG stats are fetched.
 */

import { prisma } from "@/lib/prisma";

/** Write just the Instagram-derived numbers. Called from getStatsForUser when real
 *  (non-mock) IG data was fetched, so active creators' caches stay fresh for free. */
export async function writeInstagramStatsCache(
  userId: string,
  followers: number,
  engagementRate: number
): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { followerCount: followers, engagementRate, statsUpdatedAt: new Date() },
    });
  } catch {
    // Non-critical; ignore (e.g. row gone).
  }
}

/** Full refresh from whichever platforms the creator has connected. Never throws.
 *  IG is preferred for followerCount + engagement; YT subscribers are the fallback size. */
export async function refreshCreatorStatsCache(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        instagramUserId: true,
        instagramAccessToken: true,
        youtubeChannelId: true,
        youtubeAccessToken: true,
      },
    });
    if (!user) return;

    let followerCount: number | null = null;
    let engagementRate: number | null = null;

    if (user.instagramUserId && user.instagramAccessToken) {
      const { getStatsForUser } = await import("@/lib/instagram-api");
      const ig = await getStatsForUser(userId);
      if (typeof ig.followers === "number") followerCount = ig.followers;
      if (typeof ig.avgEngagement === "number") engagementRate = ig.avgEngagement;
    }

    // Fall back to YouTube subscribers for audience size when IG isn't connected.
    if ((followerCount == null || followerCount === 0) && user.youtubeChannelId && user.youtubeAccessToken) {
      const { getYouTubeStatsForUser } = await import("@/lib/youtube-api");
      const yt = await getYouTubeStatsForUser(userId);
      if (yt && typeof yt.subscriberCount === "number") followerCount = yt.subscriberCount;
    }

    if (followerCount == null && engagementRate == null) return;

    await prisma.user.update({
      where: { id: userId },
      data: { followerCount, engagementRate, statsUpdatedAt: new Date() },
    });
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[refreshCreatorStatsCache] skipped:", e);
    }
  }
}
