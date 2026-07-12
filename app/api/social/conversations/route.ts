import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET — list all conversations for the current user */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const participations = await prisma.conversationParticipant.findMany({
    where: { userId: session.user.id },
    include: {
      conversation: {
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, createdAt: true, senderId: true },
          },
          participants: {
            where: { userId: { not: session.user.id } },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatarUrl: true,
                  accountType: true,
                  verifiedTier: true,
                  brandProfile: { select: { companyName: true, logoUrl: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  const result = participations.map((p) => {
    const lastMsg = p.conversation.messages[0] ?? null;
    const other = p.conversation.participants[0]?.user ?? null;
    const unread = lastMsg && lastMsg.senderId !== session.user.id && (!p.lastReadAt || lastMsg.createdAt > p.lastReadAt);
    return {
      id: p.conversation.id,
      other,
      lastMessage: lastMsg ? { body: lastMsg.body, at: lastMsg.createdAt, mine: lastMsg.senderId === session.user.id } : null,
      unread: !!unread,
      lastReadAt: p.lastReadAt ?? null,
      updatedAt: p.conversation.updatedAt,
    };
  });

  return NextResponse.json(result);
}

/** POST — start or get existing conversation with another user */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { otherUserId } = (await req.json().catch(() => ({}))) as { otherUserId?: string };
  if (!otherUserId) return NextResponse.json({ error: "otherUserId required" }, { status: 400 });
  if (otherUserId === session.user.id) return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });

  // Check if conversation already exists
  const existing = await prisma.conversation.findFirst({
    where: {
      participants: {
        every: { userId: { in: [session.user.id, otherUserId] } },
      },
      AND: [
        { participants: { some: { userId: session.user.id } } },
        { participants: { some: { userId: otherUserId } } },
      ],
    },
    select: { id: true },
  });

  if (existing) return NextResponse.json({ conversationId: existing.id });

  // Cold-messaging gate: a free brand may only start a NEW conversation with a creator
  // who has applied to one of its campaigns. Messaging any creator directly is a Brand Pro
  // feature. (Replies to existing conversations are already allowed above.)
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { accountType: true, verifiedTier: true },
  });
  if (me?.accountType === "brand" && me.verifiedTier !== "brand_verified") {
    const related = await prisma.campaignApplication.findFirst({
      where: { creatorId: otherUserId, campaign: { brandId: session.user.id } },
      select: { id: true },
    });
    if (!related) {
      return NextResponse.json(
        {
          error: "Upgrade to Brand Pro to message creators who haven't applied to your campaigns.",
          code: "cold_message_locked",
        },
        { status: 403 }
      );
    }
  }

  const convo = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId: session.user.id }, { userId: otherUserId }],
      },
    },
  });

  return NextResponse.json({ conversationId: convo.id }, { status: 201 });
}
