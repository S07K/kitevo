import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "media_kit_pro_customer";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function getSecret(): string {
  const s = process.env.SUBSCRIPTION_COOKIE_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    throw new Error("SUBSCRIPTION_COOKIE_SECRET is required in production");
  }
  return s || "dev-secret-change-in-production";
}

function sign(value: string): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(value);
  return `${value}.${hmac.digest("hex")}`;
}

function verify(cookieValue: string): string | null {
  const dot = cookieValue.lastIndexOf(".");
  if (dot === -1) return null;
  const value = cookieValue.slice(0, dot);
  const sig = cookieValue.slice(dot + 1);
  const expected = sign(value);
  const expectedSig = expected.slice(expected.lastIndexOf(".") + 1);
  try {
    if (timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) {
      return value;
    }
  } catch {
    return null;
  }
  return null;
}

export function setSubscriptionCookie(customerId: string): string {
  const value = sign(customerId);
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function getSubscriptionCustomerId(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verify(match[1].trim());
}

export function clearSubscriptionCookie(): string {
  const base = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  return process.env.NODE_ENV === "production" ? `${base}; Secure` : base;
}
