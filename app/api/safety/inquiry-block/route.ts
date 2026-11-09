import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Block a kit-inquiry sender by email (they have no account). POST { inquiryId } blocks the
 * sender of one of MY inquiries; DELETE ?email= unblocks. Later inquiries from a blocked
 * email are accepted silently and dropped.
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const me = session?.user?.id;
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { inquiryId?: unknown };
  const inquiryId = typeof body.inquiryId === "string" ? body.inquiryId : "";
  const inq = await prisma.inquiry.findFirst({ where: { id: inquiryId, kit: { userId: me } }, select: { email: true } });
  if (!inq) return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
  const email = inq.email.trim().toLowerCase();
  await prisma.inquiryBlock.upsert({ where: { userId_email: { userId: me, email } }, create: { userId: me, email }, update: {} });
  return NextResponse.json({ ok: true, email });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const me = session?.user?.id;
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = (new URL(req.url).searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Missing email." }, { status: 400 });
  await prisma.inquiryBlock.deleteMany({ where: { userId: me, email } });
  return NextResponse.json({ ok: true });
}
