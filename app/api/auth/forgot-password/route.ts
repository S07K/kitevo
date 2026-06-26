import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json() as { email?: string };
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });

    // Always return success to avoid user enumeration
    if (!user || !user.passwordHash) return NextResponse.json({ ok: true });

    const resetPasswordToken = randomBytes(32).toString("hex");
    const resetPasswordTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

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
