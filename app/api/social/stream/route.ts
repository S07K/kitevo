import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
// Keep nodejs runtime — edge doesn't support prisma
export const runtime = "nodejs";
// Allow long-lived connections on Vercel Pro (max 300s); free tier caps at 60s
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  // Client sends ?since=<ISO timestamp> to get events after a point in time.
  // Falls back to 10s ago to catch anything sent just before connecting.
  const sinceParam = req.nextUrl.searchParams.get("since");
  let lastCheck = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 10_000);

  const encoder = new TextEncoder();

  function encode(type: string, payload: unknown): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify({ type, payload })}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      // Send an immediate heartbeat so the client knows the stream is live
      controller.enqueue(encode("connected", { at: new Date().toISOString() }));

      const interval = setInterval(async () => {
        const now = new Date();
        try {
          // Find new messages in any conversation this user participates in
          const newMessages = await prisma.message.findMany({
            where: {
              createdAt: { gt: lastCheck },
              conversation: {
                participants: { some: { userId } },
              },
            },
            select: {
              id: true,
              body: true,
              createdAt: true,
              senderId: true,
              conversationId: true,
              sender: {
                select: {
                  name: true,
                  avatarUrl: true,
                  accountType: true,
                  verifiedTier: true,
                },
              },
            },
            orderBy: { createdAt: "asc" },
          });

          if (newMessages.length > 0) {
            // Group by conversation so clients can update the right thread
            const byConvo: Record<string, typeof newMessages> = {};
            for (const m of newMessages) {
              (byConvo[m.conversationId] ??= []).push(m);
            }
            for (const [conversationId, messages] of Object.entries(byConvo)) {
              controller.enqueue(encode("messages", { conversationId, messages }));
            }
            // Signal that conversation list order/unread counts need refreshing
            controller.enqueue(encode("conversations_updated", {}));
          }

          // Send a periodic ping to keep the connection alive through proxies
          controller.enqueue(encode("ping", { at: now.toISOString() }));
        } catch {
          // DB error on one tick shouldn't kill the stream
        }
        lastCheck = now;
      }, 2000);

      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    },
  });
}
