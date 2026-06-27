import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["new", "reviewing", "negotiating", "won", "lost"] as const;

/** PATCH /api/inquiries/[id] — update read status and/or pipeline status */
export async function PATCH(
  req: NextRequest,
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

  const body = await req.json().catch(() => ({}));
  const data: { read?: boolean; status?: string } = {};

  if (body.read === true || body.read === false) data.read = body.read;
  if (typeof body.status === "string" && VALID_STATUSES.includes(body.status as typeof VALID_STATUSES[number])) {
    data.status = body.status;
    if (body.status !== "new") data.read = true;
  }

  if (Object.keys(data).length === 0) data.read = true;

  const updated = await prisma.inquiry.update({ where: { id }, data });
  return NextResponse.json(updated);
}
