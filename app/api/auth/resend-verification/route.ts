import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json() as { email?: string };
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

    // Always return success to avoid user enumeration
    if (!user || user.emailVerified) {
      return NextResponse.json({ ok: true });
    }

    const emailVerifyToken = randomBytes(32).toString("hex");
    const emailVerifyTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
