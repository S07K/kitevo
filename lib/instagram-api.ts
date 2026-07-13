/**
 * Server-side Instagram data for a user.
 * Uses stored token when present (Meta Graph API); otherwise returns mock data.
 * Handles token refresh when near expiry and clears token on 190 (expired/invalid).
 */

import { prisma } from "@/lib/prisma";
import { getInstagramStats } from "@/lib/platforms/instagram";
import type { AudienceBucket, PlatformStatsWithCharts } from "@/lib/platforms/types";
import type { FetchedPost } from "@/lib/platforms/instagram";
import {
  insightPayloadToAudienceBuckets,
  type InsightDemographicsPayload,
} from "@/lib/instagram-demographics";
import { writeInstagramStatsCache } from "@/lib/creator-stats-cache";

const GRAPH = "https://graph.facebook.com/v18.0";
/** Demographic insights — use a recent Graph version; param name is often `breakdown` (singular), not `breakdowns`. */
const GRAPH_INSIGHTS_DEMOGRAPHICS = "https://graph.facebook.com/v22.0";
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

/** Thrown when Meta returns an error; code 190 = token expired/invalid. */
export class MetaApiError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.name = "MetaApiError";
    this.code = code;
  }
}

async function metaGet<T>(
  path: string,
  accessToken: string,
  options?: { baseUrl?: string }
): Promise<T> {
  const base = options?.baseUrl ?? GRAPH;
  const url = path.includes("?")
    ? `${base}${path}&access_token=${encodeURIComponent(accessToken)}`
    : `${base}${path}?access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  const data = (await res.json()) as T & { error?: { message: string; code?: number } };
  if (data.error) throw new MetaApiError(data.error.message || "Meta API error", data.error.code);
  return data;
}

/**
 * Follower / engaged audience age breakdown (requires instagram_manage_insights + professional account).
 * Tries follower_demographics first, then engaged_audience_demographics; multiple timeframes and query shapes for API compatibility.
 */
async function fetchInstagramAudienceDemographics(
  igUserId: string,
  accessToken: string
): Promise<AudienceBucket[] | undefined> {
  const metrics = ["follower_demographics", "engaged_audience_demographics"] as const;
  const timeframes = ["last_90_days", "this_month"] as const;

  // Meta returns (#100) "A breakdown parameter must be inputted..." if `breakdown` / `breakdowns` is missing or wrong.
  // IG User insights expect `breakdown=age` (singular) for demographic metrics in many Graph versions.
  const breakdownParams = [
    "breakdown=age",
    "breakdowns=age",
    "breakdown=age,gender",
    "breakdowns=age,gender",
  ];

  for (const metric of metrics) {
    for (const timeframe of timeframes) {
      const queryPaths = breakdownParams.map(
        (bd) =>
          `/${igUserId}/insights?metric=${metric}&period=lifetime&timeframe=${timeframe}&metric_type=total_value&${bd}`
      );
      for (const path of queryPaths) {
        try {
          const res = await metaGet<InsightDemographicsPayload>(path, accessToken, {
            baseUrl: GRAPH_INSIGHTS_DEMOGRAPHICS,
          });
          const buckets = insightPayloadToAudienceBuckets(res);
          if (buckets?.length) return buckets;
        } catch (e) {
          if (process.env.NODE_ENV === "development") {
            console.warn(
              `[instagram demographics] skip ${metric} ${timeframe}:`,
              e instanceof Error ? e.message : e
            );
          }
        }
      }
    }
  }

  return undefined;
}

/** Refresh long-lived token if it expires within 14 days. New token gets a new 60-day window. */
async function refreshInstagramTokenIfNeeded(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { instagramAccessToken: true, instagramTokenExpiresAt: true },
  });
  if (!user?.instagramAccessToken || !META_APP_ID || !META_APP_SECRET) return;
  const expiresAt = user.instagramTokenExpiresAt;
  const daysLeft = expiresAt ? (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24) : 0;
  if (daysLeft > 14) return;

  try {
    const url = `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${encodeURIComponent(user.instagramAccessToken)}`;
    const res = await fetch(url);
    const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: { code?: number } };
    if (data.error?.code === 190 || !data.access_token) {
      await prisma.user.update({
        where: { id: userId },
        data: { instagramAccessToken: null, instagramTokenExpiresAt: null },
      });
      return;
    }
    const tokenExpiresAt =
      typeof data.expires_in === "number" && data.expires_in > 0
        ? new Date(Date.now() + data.expires_in * 1000)
        : null;
    await prisma.user.update({
      where: { id: userId },
      data: { instagramAccessToken: data.access_token, instagramTokenExpiresAt: tokenExpiresAt },
    });
  } catch {
    // On any error leave token as-is; next API call may get 190 and we'll clear then
  }
}

async function clearUserInstagramToken(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { instagramAccessToken: null, instagramTokenExpiresAt: null },
  });
}

/** Profile image URL from Instagram Graph (requires valid token + instagramUserId). */
export async function getInstagramProfilePictureForUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { instagramUserId: true, instagramAccessToken: true },
  });
  if (!user?.instagramUserId || !user?.instagramAccessToken) return null;
  try {
    const data = await metaGet<{ profile_picture_url?: string }>(
      `/${user.instagramUserId}?fields=profile_picture_url`,
      user.instagramAccessToken
    );
    return typeof data.profile_picture_url === "string" ? data.profile_picture_url : null;
  } catch {
    return null;
  }
}

/** Fetch Instagram stats for a user. Uses token from DB if set; else mock. Refreshes token when near expiry; on 190 falls back to mock. */
export async function getStatsForUser(userId: string): Promise<PlatformStatsWithCharts> {
  await refreshInstagramTokenIfNeeded(userId);
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
      // Optional: fetch insights for growth (follower_count with period=day); may be restricted for small accounts.
      // Meta returns at most ~30 days of daily values, so label points with real dates —
      // never fake month names — and only chart when there's at least a week of data.
      let growthDataPoints: { month: string; followers: number }[] = [];
      try {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const until = new Date();
        const insightsRes = await metaGet<{ data?: Array<{ values?: Array<{ value: number; end_time?: string }> }> }>(
          `/${user.instagramUserId}/insights?metric=follower_count&period=day&since=${Math.floor(since.getTime() / 1000)}&until=${Math.floor(until.getTime() / 1000)}`,
          user.instagramAccessToken
        );
        const values = insightsRes.data?.[0]?.values ?? [];
        if (values.length >= 7) {
          // follower_count is NEW followers per day, not the running total. Rebuild the
          // cumulative total by walking backwards from today's real follower count, so the
          // chart shows "followers over the last 30 days" and ends exactly at `followers`.
          const deltas = values.map((v) => (typeof v.value === "number" ? v.value : 0));
          let running = followers;
          const totals: number[] = new Array(deltas.length);
          for (let i = deltas.length - 1; i >= 0; i--) {
            totals[i] = running;
            running -= deltas[i];
          }
          growthDataPoints = values.map((v, i) => ({
            month: v.end_time
              ? new Date(v.end_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "",
            followers: Math.max(0, totals[i]),
          }));
        }
      } catch {
        // Insights not available (e.g. < 100 followers). Leave growthDataPoints empty —
        // the kit page shows an honest "data will appear once available" state instead.
        // Never fabricate a curve: the product's promise is verified live stats.
      }
      // growthThisMonth: change across the ~30-day insights window; 0 when no real data.
      const windowStart = growthDataPoints.length >= 2 ? growthDataPoints[0].followers : followers;
      const growthThisMonth = windowStart > 0 ? ((followers - windowStart) / windowStart) * 100 : 0;

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

      let audienceDemographics: AudienceBucket[] | undefined;
      try {
        audienceDemographics = await fetchInstagramAudienceDemographics(
          user.instagramUserId,
          user.instagramAccessToken
        );
      } catch {
        // Demographics require 100+ followers / engagements for many accounts; ignore
      }

      // Opportunistically refresh the discover cache with these live numbers.
      writeInstagramStatsCache(userId, followers, avgEngagement).catch(() => {});

      return {
        followers,
        avgEngagement,
        growthThisMonth,
        extra: { posts: mediaCount },
        growthDataPoints: growthDataPoints.length ? growthDataPoints : undefined,
        audienceDemographics,
      };
    } catch (e) {
      if (e instanceof MetaApiError && e.code === 190) {
        await clearUserInstagramToken(userId);
      } else {
        console.error("Meta Instagram stats error:", e);
      }
      return getInstagramStats();
    }
  }
  return getInstagramStats();
}

/** Fetch recent Instagram posts with engagement metrics. Falls back to mock if no token. */
export async function getRecentPostsForUser(userId: string): Promise<FetchedPost[]> {
  await refreshInstagramTokenIfNeeded(userId);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { instagramUserId: true, instagramAccessToken: true },
  });
  if (user?.instagramUserId && user?.instagramAccessToken) {
    const token = user.instagramAccessToken;
    const igId = user.instagramUserId;
    try {
      type RawMedia = {
        id: string;
        media_type?: string;
        media_url?: string;
        thumbnail_url?: string;
        permalink?: string;
        caption?: string;
        like_count?: number;
        comments_count?: number;
        timestamp?: string;
      };
      const media = await metaGet<{ data?: RawMedia[] }>(
        `/${igId}/media?fields=id,media_type,media_url,thumbnail_url,permalink,caption,like_count,comments_count,timestamp&limit=24`,
        token
      );
      const list = media.data ?? [];

      // Fetch insights (reach, saved, video_views) in parallel for up to 12 posts
      const withInsights = await Promise.allSettled(
        list.slice(0, 12).map(async (m) => {
          const isVideo = m.media_type === "VIDEO";
          const metrics = isVideo ? "reach,saved,video_views" : "reach,saved";
          try {
            const ins = await metaGet<{ data?: Array<{ name: string; values?: Array<{ value: number }> }> }>(
              `/${m.id}/insights?metric=${metrics}`,
              token
            );
            const get = (name: string) =>
              ins.data?.find((d) => d.name === name)?.values?.[0]?.value;
            return { ...m, reach: get("reach"), saves: get("saved"), views: get("video_views") };
          } catch {
            return { ...m };
          }
        })
      );

      return list.map((m, i) => {
        const enriched =
          i < 12 && withInsights[i].status === "fulfilled"
            ? (withInsights[i] as PromiseFulfilledResult<RawMedia & { reach?: number; saves?: number; views?: number }>).value
            : m;
        const thumb = m.media_type === "VIDEO" ? (m.thumbnail_url || m.media_url || "") : (m.media_url || "");
        return {
          id: m.id,
          platform: "instagram" as const,
          thumbnailUrl: thumb,
          caption: m.caption ?? null,
          permalink: m.permalink,
          mediaType: (["IMAGE", "VIDEO", "CAROUSEL_ALBUM"].includes(m.media_type ?? "")
            ? m.media_type
            : undefined) as FetchedPost["mediaType"],
          timestamp: m.timestamp,
          likes: m.like_count,
          comments: m.comments_count,
          saves: (enriched as typeof enriched & { saves?: number }).saves,
          views: (enriched as typeof enriched & { views?: number }).views,
          reach: (enriched as typeof enriched & { reach?: number }).reach,
        };
      });
    } catch (e) {
      if (e instanceof MetaApiError && e.code === 190) {
        await clearUserInstagramToken(userId);
      } else {
        console.error("Meta Instagram media error:", e);
      }
    }
  }
  const { getInstagramRecentPosts } = await import("@/lib/platforms/instagram");
  return getInstagramRecentPosts();
}
