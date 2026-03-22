import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";

const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;
const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const COOKIE_NAME = "instagram_connect_state";
const RETURN_COOKIE_NAME = "instagram_connect_return";
const GRAPH = "https://graph.facebook.com/v18.0";

function clearStateCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function clearReturnCookie() {
  return `${RETURN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function getReturnPath(cookieHeader: string): string {
  const match = cookieHeader.match(new RegExp(`${RETURN_COOKIE_NAME}=([^;]+)`));
  const value = match ? decodeURIComponent(match[1].trim()) : "";
  return value === "onboarding" ? "/onboarding" : "/dashboard";
}

function verifyState(cookieValue: string | null, queryState: string | null): boolean {
  if (!cookieValue || !queryState) return false;
  const dot = cookieValue.lastIndexOf(".");
  if (dot === -1) return false;
  const state = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const secret = META_APP_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev-secret");
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(state).digest("hex");
  try {
    return state === queryState && timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

/** GET /api/instagram/callback — Meta OAuth callback; exchange code, get IG account, save to user. */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const stateCookie = match ? decodeURIComponent(match[1].trim()) : null;
  const returnPath = getReturnPath(cookieHeader);

  const res = NextResponse.redirect(new URL(returnPath, BASE_URL));
  res.headers.set("Set-Cookie", clearStateCookie());
  res.headers.append("Set-Cookie", clearReturnCookie());

  if (error) {
    res.headers.set("Location", `${BASE_URL}${returnPath}?instagram_error=${encodeURIComponent(error)}`);
    return res;
  }

  if (!session?.user?.id || !code || !verifyState(stateCookie, state)) {
    res.headers.set("Location", `${BASE_URL}${returnPath}?instagram_error=invalid`);
    return res;
  }

  if (!META_APP_ID || !META_APP_SECRET) {
    res.headers.set("Location", `${BASE_URL}${returnPath}?instagram_error=not_configured`);
    return res;
  }

  const redirectUri = `${BASE_URL}/api/instagram/callback`;

  try {
    // 1. Exchange code for short-lived token
    const tokenUrl = `${GRAPH}/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${META_APP_SECRET}&code=${encodeURIComponent(code)}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = (await tokenRes.json()) as { access_token?: string; error?: { message: string } };
    if (!tokenData.access_token) {
      const msg = tokenData.error?.message || "token_exchange_failed";
      res.headers.set("Location", `${BASE_URL}${returnPath}?instagram_error=${encodeURIComponent(msg)}`);
      return res;
    }

    let accessToken = tokenData.access_token;

    // 2. Exchange for long-lived token (optional but recommended)
    const longLivedUrl = `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${encodeURIComponent(accessToken)}`;
    const longRes = await fetch(longLivedUrl);
    const longData = (await longRes.json()) as { access_token?: string; expires_in?: number };
    let tokenExpiresAt: Date | null = null;
    if (longData.access_token) {
      accessToken = longData.access_token;
      if (typeof longData.expires_in === "number" && longData.expires_in > 0) {
        tokenExpiresAt = new Date(Date.now() + longData.expires_in * 1000);
      }
    }

    // 3. Get pages with Instagram Business Account (requires pages_show_list permission)
    const accountsUrl = `${GRAPH}/me/accounts?fields=id,name,instagram_business_account&access_token=${encodeURIComponent(accessToken)}`;
    const accountsRes = await fetch(accountsUrl);
    const accountsData = (await accountsRes.json()) as {
      data?: Array<{ id: string; name?: string; instagram_business_account?: { id: string } }>;
      error?: { message: string; code?: number; type?: string };
    };

    if (accountsData.error) {
      console.error("[Instagram callback] Meta /me/accounts error:", accountsData.error);
      const code = accountsData.error.code;
      // 190 = token issue; 10 = permission; 4 = rate limit; 17 = permission
      if (code === 190 || code === 10 || code === 17) {
        res.headers.set("Location", `${BASE_URL}${returnPath}?instagram_error=permission_denied`);
      } else {
        res.headers.set("Location", `${BASE_URL}${returnPath}?instagram_error=no_pages`);
      }
      return res;
    }

    const pages = accountsData.data ?? [];
    if (pages.length === 0) {
      res.headers.set("Location", `${BASE_URL}${returnPath}?instagram_error=no_pages`);
      return res;
    }

    const pageWithIg = pages.find((p) => p.instagram_business_account?.id);
    const igUserId = pageWithIg?.instagram_business_account?.id;

    if (!igUserId) {
      res.headers.set("Location", `${BASE_URL}${returnPath}?instagram_error=no_instagram_account`);
      return res;
    }

    // 4. Save to user (token + expiry for refresh handling)
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        instagramUserId: igUserId,
        instagramAccessToken: accessToken,
        instagramTokenExpiresAt: tokenExpiresAt,
      },
    });

    res.headers.set("Location", `${BASE_URL}${returnPath}?instagram_connected=1`);
  } catch (e) {
    console.error("Instagram callback error:", e);
    res.headers.set("Location", `${BASE_URL}${returnPath}?instagram_error=server`);
  }

  return res;
}
