import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { invalidatePlatformCache } from "@/lib/platform-cache";
import { APP_URL } from "@/lib/app-url";

/**
 * Meta's Data Deletion Request Callback.
 *
 * Fires when someone removes Kitevo from their Facebook/Instagram app settings. Meta
 * requires this URL to exist before App Review, and its absence is a standard rejection.
 * It is NOT the same as `/api/me/delete-account`: that one is authenticated, in-app, and
 * removes the whole Kitevo account. This one is unauthenticated, called server-to-server
 * by Meta, and is authenticated instead by an HMAC signature over the request body.
 *
 * Scope of the deletion is deliberately "the data Meta gave us", not the user's whole
 * account: they may have signed up by email and still want their kit. So we clear the
 * Instagram connection and every stat derived from it, and leave the account intact.
 *
 * Meta requires a JSON response of exactly { url, confirmation_code }.
 * https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */

/** Meta's base64url variant omits padding and uses -/_ . */
function b64urlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

interface SignedRequest {
  user_id?: string;
  algorithm?: string;
  issued_at?: number;
}

/**
 * Verify and decode Meta's `signed_request`. Returns null on any failure — a bad
 * signature is indistinguishable from an attacker, so it must never delete anything.
 */
function parseSignedRequest(signed: string, appSecret: string): SignedRequest | null {
  const [encodedSig, payload] = signed.split(".", 2);
  if (!encodedSig || !payload) return null;

  const expected = crypto.createHmac("sha256", appSecret).update(payload).digest();
  const actual = b64urlDecode(encodedSig);

  // Length check first: timingSafeEqual throws on a mismatch rather than returning false.
  if (actual.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(actual, expected)) return null;

  try {
    const data = JSON.parse(b64urlDecode(payload).toString("utf8")) as SignedRequest;
    // Meta only signs with HMAC-SHA256; anything else means the format changed under us.
    if (data.algorithm && data.algorithm.toUpperCase() !== "HMAC-SHA256") return null;
    return data;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) {
    console.error("[meta/data-deletion] META_APP_SECRET is not set; cannot verify request");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Meta posts this form-encoded, but accept JSON too so the endpoint is testable by hand.
  let signed: string | null = null;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { signed_request?: string };
    signed = body.signed_request ?? null;
  } else {
    const form = await req.formData().catch(() => null);
    const value = form?.get("signed_request");
    signed = typeof value === "string" ? value : null;
  }

  if (!signed) {
    return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
  }

  const data = parseSignedRequest(signed, appSecret);
  if (!data?.user_id) {
    return NextResponse.json({ error: "Invalid signed_request" }, { status: 400 });
  }

  // `user_id` is the app-scoped id, which is what we stored at connect time.
  const users = await prisma.user.findMany({
    where: { instagramUserId: data.user_id },
    select: { id: true },
  });

  for (const user of users) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        instagramUserId: null,
        instagramAccessToken: null,
        instagramTokenExpiresAt: null,
        // Cached aggregates derived from Meta data. Leaving these would keep showing
        // Instagram-sourced numbers on a kit after the user revoked access.
        followerCount: null,
        engagementRate: null,
        statsUpdatedAt: null,
      },
    });
    invalidatePlatformCache(user.id);
  }

  // Meta shows this to the user as proof the request was handled. Deterministic per
  // request so a retry doesn't mint a new one, and it contains no personal data.
  const confirmationCode = crypto
    .createHash("sha256")
    .update(`${data.user_id}:${data.issued_at ?? ""}`)
    .digest("hex")
    .slice(0, 16);

  return NextResponse.json({
    url: `${APP_URL}/privacy#data-deletion`,
    confirmation_code: confirmationCode,
  });
}
