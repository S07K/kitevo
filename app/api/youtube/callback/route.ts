import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidatePlatformCache } from "@/lib/platform-cache";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const rawState = searchParams.get("state") ?? "";
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // State format: "userId" or "userId:return_to"
  const colonIdx = rawState.indexOf(":");
  const userId = colonIdx >= 0 ? rawState.slice(0, colonIdx) : rawState;
  const returnTo = colonIdx >= 0 ? rawState.slice(colonIdx + 1) : "";

  const baseRedirect = returnTo === "onboarding"
    ? `${appUrl}/onboarding`
    : `${appUrl}/dashboard`;

  if (error || !code || !userId) {
    return NextResponse.redirect(`${baseRedirect}?youtube=error`);
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
    const body = await tokenRes.text();
    console.error("[youtube/callback] token exchange failed:", tokenRes.status, body);
    return NextResponse.redirect(`${baseRedirect}?youtube=error`);
  }

  const tokens = await tokenRes.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!tokens.access_token) {
    return NextResponse.redirect(`${baseRedirect}?youtube=error`);
  }

  // Fetch the user's channel id
  const channelRes = await fetch(
    `${YOUTUBE_API}/channels?part=snippet&mine=true&access_token=${encodeURIComponent(tokens.access_token)}`
  );

  if (!channelRes.ok) {
    const body = await channelRes.text();
    console.error("[youtube/callback] channel fetch failed:", channelRes.status, body);
    return NextResponse.redirect(`${baseRedirect}?youtube=error`);
  }

  const channelData = await channelRes.json() as {
    items?: Array<{ id: string }>;
  };

  const channelId = channelData.items?.[0]?.id;
  if (!channelId) {
    return NextResponse.redirect(`${baseRedirect}?youtube=no_channel`);
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
  // Drop cached platform data so the kit reflects the new connection immediately.
  invalidatePlatformCache(userId);

  return NextResponse.redirect(`${baseRedirect}?youtube=connected`);
}
