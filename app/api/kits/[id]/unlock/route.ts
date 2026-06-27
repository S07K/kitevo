import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/** POST /api/kits/[id]/unlock — verify kit password, set unlock cookie */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  const kit = await prisma.kit.findUnique({ where: { id }, select: { passwordHash: true } });
  if (!kit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!kit.passwordHash) return NextResponse.json({ ok: true }); // no password

  const valid = await bcrypt.compare(password, kit.passwordHash);
  if (!valid) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(`kit_unlock_${id}`, kit.passwordHash, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h
  });
  return res;
}
