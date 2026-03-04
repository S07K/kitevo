/**
 * Server-side Instagram data for a user.
 * Uses stored token when present (Meta Graph API); otherwise returns mock data.
 * Used by GET /api/instagram/stats, GET /api/instagram/recent-posts, and public kit page.
 */

import { prisma } from "@/lib/prisma";
import { getInstagramStats } from "@/lib/platforms/instagram";
import type { PlatformStatsWithCharts } from "@/lib/platforms/types";
import type { FetchedPost } from "@/lib/platforms/instagram";

const GRAPH = "https://graph.facebook.com/v18.0";

async function metaGet<T>(path: string, accessToken: string): Promise<T> {
  const url = path.includes("?") ? `${GRAPH}${path}&access_token=${encodeURIComponent(accessToken)}` : `${GRAPH}${path}?access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const data = (await res.json()) as T & { error?: { message: string; code?: number } };
  if (data.error) throw new Error(data.error.message || "Meta API error");
  return data;
}

/** Fetch Instagram stats for a user. Uses token from DB if set; else mock. */
export async function getStatsForUser(userId: string): Promise<PlatformStatsWithCharts> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { instagramUserId: true, instagramAccessToken: true },
  });
  if (user?.instagramUserId && user?.instagramAccessToken) {
    try {
      // followers_count, media_count from IG User node
      const profile = await metaGet<{ followers_count?: number; media_count?: number }>(
        `/${user.instagramUserId}?fields=followers_count,media_count`,
        user.instagramAccessToken
      );
      const followers = profile.followers_count ?? 0;
      const mediaCount = profile.media_count ?? 0;
      // Optional: fetch insights for growth (follower_count with period=day); may be restricted for small accounts
      let growthDataPoints: { month: string; followers: number }[] = [];
      try {
        const since = new Date();
        since.setDate(since.getDate() - 180);
        const until = new Date();
        const insightsRes = await metaGet<{ data?: Array<{ values?: Array<{ value: number }> }> }>(
          `/${user.instagramUserId}/insights?metric=follower_count&period=day&since=${Math.floor(since.getTime() / 1000)}&until=${Math.floor(until.getTime() / 1000)}`,
          user.instagramAccessToken
        );
        if (insightsRes.data?.[0]?.values?.length) {
          const values = insightsRes.data[0].values;
          growthDataPoints = values.slice(-6).map((v, i) => ({
            month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"][i] || String(i),
            followers: typeof v.value === "number" ? v.value : 0,
          }));
        }
      } catch {
        // Insights not available (e.g. < 100 followers); use simple placeholder
        growthDataPoints = [
          { month: "Jan", followers: Math.max(0, followers - 2000) },
          { month: "Feb", followers: Math.max(0, followers - 1500) },
          { month: "Mar", followers: Math.max(0, followers - 1000) },
          { month: "Apr", followers: Math.max(0, followers - 500) },
          { month: "May", followers: followers },
          { month: "Jun", followers: followers },
        ];
      }
      // growthThisMonth: from insights (daily follower_count) or placeholder; placeholder often yields 0% for small accounts
      const prevMonth = growthDataPoints.length >= 2 ? growthDataPoints[growthDataPoints.length - 2].followers : followers;
      const growthThisMonth = prevMonth > 0 ? ((followers - prevMonth) / prevMonth) * 100 : 0;

      // avgEngagement: not on profile; compute from recent media insights (engagement/reach) when available
      let avgEngagement = 0;
      try {
        const mediaRes = await metaGet<{ data?: Array<{ id: string }> }>(
          `/${user.instagramUserId}/media?fields=id&limit=10`,
          user.instagramAccessToken
        );
        const mediaIds = (mediaRes.data ?? []).map((m) => m.id).slice(0, 5);
        let totalEngagement = 0;
        let totalReach = 0;
        for (const mid of mediaIds) {
          const ins = await metaGet<{ data?: Array<{ name: string; values?: Array<{ value: number }> }> }>(
            `/${mid}/insights?metric=engagement,reach`,
            user.instagramAccessToken
          );
          const engagement = ins.data?.find((d) => d.name === "engagement")?.values?.[0]?.value ?? 0;
          const reach = ins.data?.find((d) => d.name === "reach")?.values?.[0]?.value ?? 0;
          if (reach > 0) {
            totalEngagement += engagement;
            totalReach += reach;
          }
        }
        if (totalReach > 0) avgEngagement = (totalEngagement / totalReach) * 100;
      } catch {
        // Media insights not available or rate limited; keep 0
      }

      return {
        followers,
        avgEngagement,
        growthThisMonth,
        extra: { posts: mediaCount },
        growthDataPoints: growthDataPoints.length ? growthDataPoints : undefined,
      };
    } catch (e) {
      console.error("Meta Instagram stats error:", e);
      return getInstagramStats();
    }
  }
  return getInstagramStats();
}

/** Fetch recent Instagram posts for a user. Uses token from DB if set; else mock. */
export async function getRecentPostsForUser(userId: string): Promise<FetchedPost[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { instagramUserId: true, instagramAccessToken: true },
  });
  if (user?.instagramUserId && user?.instagramAccessToken) {
    try {
      const media = await metaGet<{ data?: Array<{ id: string; media_type?: string; media_url?: string; permalink?: string; caption?: string }> }>(
        `/${user.instagramUserId}/media?fields=id,media_type,media_url,permalink,caption&limit=25`,
        user.instagramAccessToken
      );
      const list = media.data ?? [];
      return list.map((m) => ({
        id: m.id,
        platform: "instagram" as const,
        thumbnailUrl: m.media_url || "",
        caption: m.caption ?? null,
        permalink: m.permalink,
        mediaType: (m.media_type === "IMAGE" || m.media_type === "VIDEO" || m.media_type === "CAROUSEL_ALBUM" ? m.media_type : undefined) as FetchedPost["mediaType"],
      }));
    } catch (e) {
      console.error("Meta Instagram media error:", e);
      const { getInstagramRecentPosts } = await import("@/lib/platforms/instagram");
      return getInstagramRecentPosts();
    }
  }
  const { getInstagramRecentPosts } = await import("@/lib/platforms/instagram");
  return getInstagramRecentPosts();
}
