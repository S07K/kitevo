import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { isCopilotTask } from "@/lib/copilot-prompts";
import { CopilotError, copilotAccess, generate, publicStatus } from "@/lib/copilot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function creatorId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, accountType: true } });
  return u && u.accountType !== "brand" ? u.id : null;
}

const id = (v: unknown) => (typeof v === "string" && v.length > 0 && v.length <= 64 ? v : null);

/** GET — can this creator use Copilot right now, and on whose key (never the key). */
export async function GET() {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(publicStatus(await copilotAccess(userId)));
}

/** POST { task: "bio" | "pitch" | "inquiry_reply" | "message", kitId?, campaignId?, inquiryId?, conversationId? } → { text, status } */
export async function POST(req: Request) {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = rateLimit(`copilot:${userId}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "That's a lot of drafts in a minute. Try again shortly.", code: "rate_limited" }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isCopilotTask(body.task)) return NextResponse.json({ error: "Unknown Copilot task.", code: "bad_input" }, { status: 400 });
  try {
    const out = await generate(userId, { task: body.task, kitId: id(body.kitId), campaignId: id(body.campaignId), inquiryId: id(body.inquiryId), conversationId: id(body.conversationId) });
    return NextResponse.json(out);
  } catch (e) {
    if (e instanceof CopilotError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    console.error("[copilot] generate failed:", e);
    return NextResponse.json({ error: "Couldn't get a draft right now. Try again.", code: "ai_unavailable" }, { status: 500 });
  }
}
