import { prisma } from "@/lib/prisma";
import { cachedPlatformCall } from "@/lib/platform-cache";
import { decryptPlatformTokens, encryptToken } from "@/lib/token-crypto";

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface YouTubeStats {
  channelId: string;
  channelTitle: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  recentVideos: YouTubeVideo[];
}

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  url: string;
}

async function refreshAccessToken(userId: string, refreshToken: string): Promise<string | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    // `invalid_grant` = the refresh token is dead (revoked, or — the common case —
    // expired after 7 days because the Google OAuth consent screen is still in "Testing").
    // It can never recover on its own, so clear the connection: this flips
    // /api/youtube/status to disconnected and the dashboard prompts a reconnect, instead of
    // silently 401ing on every kit view forever while still showing "connected".
    if (err.error === "invalid_grant") {
      await prisma.user.update({
        where: { id: userId },
        data: {
          youtubeChannelId: null,
          youtubeAccessToken: null,
          youtubeRefreshToken: null,
          youtubeTokenExpiresAt: null,
        },
      });
      console.warn(`[youtube] refresh token invalid_grant for user ${userId}; cleared connection (reconnect required).`);
    } else {
      console.error("[youtube] token refresh failed:", res.status, err.error ?? "");
    }
    return null;
  }
  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: { youtubeAccessToken: encryptToken(data.access_token), youtubeTokenExpiresAt: expiresAt },
  });
  return data.access_token;
}

/**
 * Recent uploads from the channel's "uploads" playlist.
 *
 * Deliberately NOT search.list: that costs 100 quota units per call against a separate
 * "Search Queries per day" limit, and we call this on every public kit view — roughly 100
 * views exhausted the day's quota and videos silently disappeared for everyone.
 * playlistItems costs 1 unit and returns the same uploads, newest first.
 */
async function getRecentVideos(uploadsPlaylistId: string, token: string): Promise<YouTubeVideo[]> {
  const listRes = await fetch(
    `${YOUTUBE_API}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=6&access_token=${encodeURIComponent(token)}`
  );
  if (!listRes.ok) {
    console.error("[youtube] playlistItems failed:", listRes.status, (await listRes.text()).slice(0, 200));
    return [];
  }

  const listData = (await listRes.json()) as {
    items?: Array<{
      contentDetails?: { videoId?: string };
      snippet?: {
        title?: string;
        publishedAt?: string;
        thumbnails?: { medium?: { url: string }; high?: { url: string } };
      };
    }>;
  };

  const items = (listData.items ?? []).filter((i) => i.contentDetails?.videoId);
  const videoIds = items.map((i) => i.contentDetails!.videoId!);
  if (videoIds.length === 0) return [];

  // Stats for those videos (1 unit).
  const statsRes = await fetch(
    `${YOUTUBE_API}/videos?part=statistics&id=${videoIds.join(",")}&access_token=${encodeURIComponent(token)}`
  );
  if (!statsRes.ok) {
    console.error("[youtube] video statistics failed:", statsRes.status);
  }
  const statsData = statsRes.ok
    ? ((await statsRes.json()) as { items?: Array<{ id: string; statistics: { viewCount?: string; likeCount?: string } }> })
    : { items: [] };

  const statsMap = new Map((statsData.items ?? []).map((i) => [i.id, i.statistics]));

  return items.map((item) => {
    const id = item.contentDetails!.videoId!;
    const stats = statsMap.get(id) ?? {};
    return {
      id,
      title: item.snippet?.title ?? "",
      thumbnailUrl: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.medium?.url ?? "",
      viewCount: parseInt(stats.viewCount ?? "0", 10),
      likeCount: parseInt(stats.likeCount ?? "0", 10),
      publishedAt: item.snippet?.publishedAt ?? "",
      url: `https://www.youtube.com/watch?v=${id}`,
    };
  });
}

async function fetchYouTubeStatsForUser(userId: string): Promise<YouTubeStats | null> {
  const user = decryptPlatformTokens(await prisma.user.findUnique({
    where: { id: userId },
    select: {
      youtubeChannelId: true,
      youtubeAccessToken: true,
      youtubeRefreshToken: true,
      youtubeTokenExpiresAt: true,
    },
  }));

  if (!user?.youtubeAccessToken || !user?.youtubeChannelId) return null;

  let token = user.youtubeAccessToken;
  let refreshed = false;

  if (user.youtubeTokenExpiresAt && user.youtubeRefreshToken) {
    const expiresIn = user.youtubeTokenExpiresAt.getTime() - Date.now();
    if (expiresIn < 5 * 60 * 1000) {
      const fresh = await refreshAccessToken(userId, user.youtubeRefreshToken);
      refreshed = true;
      if (fresh) token = fresh;
    }
  }

  // One channels call gets stats AND the uploads playlist id (contentDetails is free here),
  // which getRecentVideos then reads instead of the expensive search endpoint.
  const channelUrl = (t: string) =>
    `${YOUTUBE_API}/channels?part=statistics,snippet,contentDetails&id=${user.youtubeChannelId}&access_token=${encodeURIComponent(t)}`;

  let channelRes = await fetch(channelUrl(token));

  // Reactive refresh: the token was rejected but we never tried a fresh one (stored expiry was
  // null/stale, or the token was revoked before its clock-time expiry). Refresh once and retry.
  // If the refresh token itself is dead, refreshAccessToken clears the connection and returns null.
  if (channelRes.status === 401 && !refreshed && user.youtubeRefreshToken) {
    const fresh = await refreshAccessToken(userId, user.youtubeRefreshToken);
    if (fresh) {
      token = fresh;
      channelRes = await fetch(channelUrl(token));
    }
  }

  if (!channelRes.ok) {
    console.error("[youtube] channels failed:", channelRes.status, (await channelRes.text()).slice(0, 200));
    return null;
  }

  const data = await channelRes.json() as {
    items?: Array<{
      id: string;
      snippet: { title: string };
      statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }>;
  };

  const channel = data.items?.[0];
  if (!channel) return null;

  const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
  const recentVideos = uploadsPlaylistId ? await getRecentVideos(uploadsPlaylistId, token) : [];

  return {
    channelId: channel.id,
    channelTitle: channel.snippet.title,
    subscriberCount: parseInt(channel.statistics.subscriberCount ?? "0", 10),
    viewCount: parseInt(channel.statistics.viewCount ?? "0", 10),
    videoCount: parseInt(channel.statistics.videoCount ?? "0", 10),
    recentVideos,
  };
}

/** Cached wrapper — the kit page calls this on every public view. */
export function getYouTubeStatsForUser(userId: string): Promise<YouTubeStats | null> {
  return cachedPlatformCall(`yt-stats:${userId}`, () => fetchYouTubeStatsForUser(userId));
}
