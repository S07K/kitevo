import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createHmac, randomBytes } from "crypto";

const META_APP_ID = process.env.META_APP_ID;
const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const COOKIE_NAME = "instagram_connect_state";
const RETURN_COOKIE_NAME = "instagram_connect_return";
const COOKIE_MAX_AGE = 60 * 10; // 10 minutes

const VALID_RETURN = new Set(["dashboard", "onboarding"]);

/** GET /api/instagram/connect — redirect to Meta OAuth (requires session). Query: return_to=onboarding|dashboard (default dashboard). */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", BASE_URL));
  }
  if (!META_APP_ID) {
    return NextResponse.redirect(
      new URL("/dashboard?instagram_error=not_configured", BASE_URL)
    );
  }

  const { searchParams } = new URL(req.url);
  const returnTo = VALID_RETURN.has(searchParams.get("return_to") ?? "") ? searchParams.get("return_to") : "dashboard";

  const state = randomBytes(24).toString("hex");
  const secret = process.env.META_APP_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    return NextResponse.redirect(new URL("/dashboard?instagram_error=not_configured", BASE_URL));
  }
  const sig = createHmac("sha256", secret || "dev-secret").update(state).digest("hex");
  const stateCookie = `${state}.${sig}`;

  const redirectUri = `${BASE_URL}/api/instagram/callback`;
  const scope = "business_management,instagram_basic,pages_show_list,instagram_manage_insights";
  const url = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  url.searchParams.set("client_id", META_APP_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", scope);
  url.searchParams.set("response_type", "code");

  const cookieOpts = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
  const res = NextResponse.redirect(url.toString());
  res.headers.append("Set-Cookie", `${COOKIE_NAME}=${stateCookie}; ${cookieOpts}`);
  res.headers.append("Set-Cookie", `${RETURN_COOKIE_NAME}=${returnTo}; ${cookieOpts}`);
  return res;
}
