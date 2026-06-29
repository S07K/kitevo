import { prisma } from "@/lib/prisma";

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface YouTubeStats {
  channelId: string;
  channelTitle: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
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
  if (!res.ok) return null;
  const data = await res.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
  await prisma.user.update({
    where: { id: userId },
    data: { youtubeAccessToken: data.access_token, youtubeTokenExpiresAt: expiresAt },
  });
  return data.access_token;
}

export async function getYouTubeStatsForUser(userId: string): Promise<YouTubeStats | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      youtubeChannelId: true,
      youtubeAccessToken: true,
      youtubeRefreshToken: true,
      youtubeTokenExpiresAt: true,
    },
  });

  if (!user?.youtubeAccessToken || !user?.youtubeChannelId) return null;

  let token = user.youtubeAccessToken;

  // Refresh token if expires within 5 minutes
  if (user.youtubeTokenExpiresAt && user.youtubeRefreshToken) {
    const expiresIn = user.youtubeTokenExpiresAt.getTime() - Date.now();
    if (expiresIn < 5 * 60 * 1000) {
      token = (await refreshAccessToken(userId, user.youtubeRefreshToken)) ?? token;
    }
  }

  const res = await fetch(
    `${YOUTUBE_API}/channels?part=statistics,snippet&id=${user.youtubeChannelId}&access_token=${encodeURIComponent(token)}`
  );

  if (!res.ok) return null;

  const data = await res.json() as {
    items?: Array<{
      id: string;
      snippet: { title: string };
      statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string };
    }>;
  };

  const channel = data.items?.[0];
  if (!channel) return null;

  return {
    channelId: channel.id,
    channelTitle: channel.snippet.title,
    subscriberCount: parseInt(channel.statistics.subscriberCount ?? "0", 10),
    viewCount: parseInt(channel.statistics.viewCount ?? "0", 10),
    videoCount: parseInt(channel.statistics.videoCount ?? "0", 10),
  };
}
