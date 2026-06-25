import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** PATCH /api/inquiries/[id] — mark inquiry as read */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    select: { kit: { select: { userId: true } } },
  });

  if (!inquiry || inquiry.kit.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.inquiry.update({ where: { id }, data: { read: true } });
  return NextResponse.json({ ok: true });
}
