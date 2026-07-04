import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/social/conversations/[id] — messages + mark read */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Verify participant
  const participation = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: session.user.id } },
  });
  if (!participation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [messages] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        body: true,
        createdAt: true,
        senderId: true,
        sender: { select: { name: true, avatarUrl: true, accountType: true, verifiedTier: true } },
      },
    }),
    // Mark as read
    prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId: session.user.id } },
      data: { lastReadAt: new Date() },
    }),
  ]);

  return NextResponse.json(messages);
}

/** POST /api/social/conversations/[id] — send a message */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { body } = (await req.json().catch(() => ({}))) as { body?: string };
  if (!body?.trim()) return NextResponse.json({ error: "body required" }, { status: 400 });

  const participation = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: session.user.id } },
  });
  if (!participation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [message] = await Promise.all([
    prisma.message.create({
      data: { conversationId: id, senderId: session.user.id, body: body.trim() },
      select: { id: true, body: true, createdAt: true, senderId: true },
    }),
    prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } }),
    prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId: id, userId: session.user.id } },
      data: { lastReadAt: new Date() },
    }),
  ]);

  return NextResponse.json(message, { status: 201 });
}
