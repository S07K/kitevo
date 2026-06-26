import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json() as { token?: string; password?: string };

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { resetPasswordToken: token } });

    if (!user || !user.resetPasswordTokenExpiresAt || user.resetPasswordTokenExpiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        emailVerified: true, // reset link proves ownership
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Reset password error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
