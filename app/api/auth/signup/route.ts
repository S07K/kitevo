import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail, VERIFY_TOKEN_TTL_MS } from "@/lib/email";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { betaCompFieldsForNewUser } from "@/lib/beta-comp";
import { trackEvent } from "@/lib/analytics";

/*
  Deliberately generous. Real users sign up once, but mobile carriers and offices put many
  people behind one IP, and blocking a genuine signup costs far more than letting some
  abuse through at this stage. Sized to stop a script creating thousands of accounts, not
  to police normal traffic.

  No per-email counterpart, unlike the other two routes: a signup by definition has no
  prior account to cool down against, and a repeat with an existing address already exits
  at the 409 below without sending anything.
*/
const IP_LIMIT = 20;
const IP_WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    /*
      Checked before any parsing or hashing. Beyond spam accounts this is CPU protection:
      the bcrypt call below runs at cost factor 12, roughly 240ms of CPU per request, so
      an unthrottled loop is a cheap way to saturate the function.
    */
    const ip = rateLimit(`signup:ip:${clientIp(req)}`, IP_LIMIT, IP_WINDOW_MS);
    if (!ip.ok) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(ip.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const { email, password, name } = body as { email?: string; password?: string; name?: string };

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    const emailVerifyToken = randomBytes(32).toString("hex");
    const emailVerifyTokenExpiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

    const user = await prisma.user.create({
      data: {
        // Beta auto-comp (no-op unless BETA_AUTO_COMP_TIER is set). Spread first so the
        // explicit fields below always win on any overlap.
        ...betaCompFieldsForNewUser(),
        email: trimmedEmail,
        name: typeof name === "string" ? name.trim() || null : null,
        passwordHash,
        emailVerified: false,
        emailVerifyToken,
        emailVerifyTokenExpiresAt,
      },
    });

    await trackEvent("signup", { userId: user.id, props: { method: "email" } });

    // Send verification email (non-blocking — don't fail signup if email fails)
    sendVerificationEmail(trimmedEmail, emailVerifyToken).catch((e) =>
      console.error("Failed to send verification email:", e)
    );

    return NextResponse.json({ id: user.id, email: user.email, name: user.name });
  } catch (e) {
    console.error("Signup error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
