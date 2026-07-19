import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail, VERIFY_TOKEN_TTL_MS } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/** A real person clicks resend once, waits, then clicks again. A minute is generous. */
const EMAIL_COOLDOWN_MS = 60 * 1000;

/** Coarse per-IP ceiling, mostly to stop a script enumerating many addresses at once. */
const IP_LIMIT = 10;
const IP_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  try {
    /*
      Unauthenticated and it sends email, so without limits anyone could mailbomb a real
      user's inbox and burn our Resend quota and sender reputation at the same time.

      Two layers, because neither is sufficient alone:
      - Per IP, in memory. Cheap, but process-local on serverless, so it only slows a
        single-source flood.
      - Per email, from the database. Durable across instances and it is the one that
        actually protects a specific inbox, which is the outcome that matters.
    */
    const ip = rateLimit(`resend-verify:ip:${clientIp(req)}`, IP_LIMIT, IP_WINDOW_MS);
    if (!ip.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ip.retryAfterSec) } }
      );
    }

    const { email } = (await req.json()) as { email?: string };
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

    // Always return success to avoid user enumeration
    if (!user || user.emailVerified) {
      return NextResponse.json({ ok: true });
    }

    /*
      Per-email cooldown. The issue time is not stored, but expiry is always issue +
      VERIFY_TOKEN_TTL_MS, so it is recoverable without a schema change.

      Returns the same { ok: true } as every other path: a distinct "too soon" response
      would leak which addresses have unverified accounts, which is exactly what the
      enumeration guard above is avoiding.
    */
    if (user.emailVerifyTokenExpiresAt) {
      const issuedAt = user.emailVerifyTokenExpiresAt.getTime() - VERIFY_TOKEN_TTL_MS;
      if (Date.now() - issuedAt < EMAIL_COOLDOWN_MS) {
        return NextResponse.json({ ok: true });
      }
    }

    const emailVerifyToken = randomBytes(32).toString("hex");
    const emailVerifyTokenExpiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken, emailVerifyTokenExpiresAt },
    });

    sendVerificationEmail(user.email, emailVerifyToken).catch((e) =>
      console.error("Failed to resend verification email:", e)
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Resend verification error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
