import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const dashboardUrl = `${appUrl}/dashboard`;

  if (error || !code || !userId) {
    return NextResponse.redirect(`${dashboardUrl}?youtube=error`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${appUrl}/api/youtube/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${dashboardUrl}?youtube=error`);
  }

  const tokens = await tokenRes.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!tokens.access_token) {
    return NextResponse.redirect(`${dashboardUrl}?youtube=error`);
  }

  // Fetch the user's channel id
  const channelRes = await fetch(
    `${YOUTUBE_API}/channels?part=snippet&mine=true&access_token=${encodeURIComponent(tokens.access_token)}`
  );

  if (!channelRes.ok) {
    return NextResponse.redirect(`${dashboardUrl}?youtube=error`);
  }

  const channelData = await channelRes.json() as {
    items?: Array<{ id: string }>;
  };

  const channelId = channelData.items?.[0]?.id;
  if (!channelId) {
    return NextResponse.redirect(`${dashboardUrl}?youtube=no_channel`);
  }

  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);

  await prisma.user.update({
    where: { id: userId },
    data: {
      youtubeChannelId: channelId,
      youtubeAccessToken: tokens.access_token,
      youtubeRefreshToken: tokens.refresh_token ?? null,
      youtubeTokenExpiresAt: expiresAt,
    },
  });

  return NextResponse.redirect(`${dashboardUrl}?youtube=connected`);
}
