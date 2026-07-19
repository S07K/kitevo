import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail, RESET_TOKEN_TTL_MS } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** A real person requests one reset, checks their inbox, maybe tries again. */
const EMAIL_COOLDOWN_MS = 60 * 1000;
const IP_LIMIT = 10;
const IP_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  try {
    /*
      Unauthenticated and it sends email, so the same exposure as resend-verification: a
      loop could fill a real user's inbox with reset links and burn the Resend quota.
      Per-IP is process-local and only slows a single source; the per-email cooldown is
      durable across instances and is what actually protects one inbox.
    */
    const ip = rateLimit(`forgot-pw:ip:${clientIp(req)}`, IP_LIMIT, IP_WINDOW_MS);
    if (!ip.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ip.retryAfterSec) } }
      );
    }

    const { email } = await req.json() as { email?: string };
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

    // Always return success to avoid user enumeration
    if (!user || !user.passwordHash) return NextResponse.json({ ok: true });

    /*
      Per-email cooldown, issue time recovered as expiry minus the TTL. Returns the same
      { ok: true } as every other path so a caller cannot distinguish a cooled-down
      address from one with no account, which is the enumeration guard directly above.
    */
    if (user.resetPasswordTokenExpiresAt) {
      const issuedAt = user.resetPasswordTokenExpiresAt.getTime() - RESET_TOKEN_TTL_MS;
      if (Date.now() - issuedAt < EMAIL_COOLDOWN_MS) {
        return NextResponse.json({ ok: true });
      }
    }

    const resetPasswordToken = randomBytes(32).toString("hex");
    const resetPasswordTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken, resetPasswordTokenExpiresAt },
    });

    sendPasswordResetEmail(user.email, resetPasswordToken).catch((e) =>
      console.error("Failed to send reset email:", e)
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Forgot password error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
