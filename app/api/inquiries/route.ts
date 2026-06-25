import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/inquiries — list all inquiries for the logged-in user's kits */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inquiries = await prisma.inquiry.findMany({
    where: { kit: { userId: session.user.id } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      email: true,
      company: true,
      message: true,
      createdAt: true,
      read: true,
      kit: { select: { id: true, name: true, slug: true } },
    },
  });

  return NextResponse.json(inquiries);
}
