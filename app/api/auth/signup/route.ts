import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
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
    const emailVerifyTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        name: typeof name === "string" ? name.trim() || null : null,
        passwordHash,
        emailVerified: false,
        emailVerifyToken,
        emailVerifyTokenExpiresAt,
      },
    });

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
