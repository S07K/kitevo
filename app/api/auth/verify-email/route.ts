import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid-token", req.url));
  }

  const user = await prisma.user.findUnique({ where: { emailVerifyToken: token } });

  if (!user || !user.emailVerifyTokenExpiresAt || user.emailVerifyTokenExpiresAt < new Date()) {
    return NextResponse.redirect(new URL("/login?error=expired-token", req.url));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyTokenExpiresAt: null,
    },
  });

  return NextResponse.redirect(new URL("/login?verified=1", req.url));
}
