import { NextResponse } from "next/server";
import { clearSubscriptionCookie } from "@/lib/subscription-cookie";

const INSTAGRAM_STATE = "instagram_connect_state";
const INSTAGRAM_RETURN = "instagram_connect_return";

function clearCookieHeader(name: string): string {
  const base = `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  return process.env.NODE_ENV === "production" ? `${base}; Secure` : base;
}

/** POST /api/auth/clear-session-cookies — clear subscription and OAuth cookies (call before signOut). */
export async function POST() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.append("Set-Cookie", clearSubscriptionCookie());
  res.headers.append("Set-Cookie", clearCookieHeader(INSTAGRAM_STATE));
  res.headers.append("Set-Cookie", clearCookieHeader(INSTAGRAM_RETURN));
  return res;
}
