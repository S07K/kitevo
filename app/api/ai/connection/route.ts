import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { AiError, verifyAiKey } from "@/lib/ai/client";
import { AI_PROVIDER_INFO, aiKeyHint, cleanModelId, isAiProvider } from "@/lib/ai/providers";
import { publicAiConnection, saveAiConnection } from "@/lib/copilot";

export const dynamic = "force-dynamic";

async function creatorId() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const u = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, accountType: true } });
  return u && u.accountType !== "brand" ? u.id : null;
}

/** GET — the creator's AI connection (never the key), or null. */
export async function GET() {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(publicAiConnection(await prisma.aiConnection.findUnique({ where: { userId } })));
}

/**
 * POST { provider, key, model? } — check the key with the provider, then save it encrypted.
 * Replaces any existing connection (one AI provider at a time). Omitting `key` with the same
 * provider only changes the model.
 */
export async function POST(req: Request) {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`ai-connect:${userId}`, 10, 10 * 60_000).ok) return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as { provider?: unknown; key?: unknown; model?: unknown };
  if (!isAiProvider(body.provider)) return NextResponse.json({ error: "Pick an AI provider.", field: "provider" }, { status: 400 });
  const provider = body.provider;
  const model = body.model === undefined || body.model === "" || body.model === null ? null : cleanModelId(body.model);
  if (body.model && !model) return NextResponse.json({ error: "That doesn't look like a model id (e.g. " + AI_PROVIDER_INFO[provider].defaultModel + ").", field: "model" }, { status: 400 });

  const key = typeof body.key === "string" ? body.key.trim() : "";
  if (!key) {
    // Model-only change on the connected provider.
    const existing = await prisma.aiConnection.findUnique({ where: { userId } });
    if (!existing || existing.provider !== provider) return NextResponse.json({ error: `Paste your ${AI_PROVIDER_INFO[provider].name} API key.`, field: "key" }, { status: 400 });
    const row = await prisma.aiConnection.update({ where: { userId }, data: { model } });
    return NextResponse.json(publicAiConnection(row));
  }
  if (key.length < 20 || key.length > 300 || /\s/.test(key)) return NextResponse.json({ error: "That doesn't look like an API key. Copy it again from your provider.", field: "key" }, { status: 400 });

  try {
    if ((await verifyAiKey(provider, key)) === "invalid") {
      return NextResponse.json({ error: `${AI_PROVIDER_INFO[provider].name} didn't accept this key. Copy it again, or create a new one.`, field: "key" }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof AiError) return NextResponse.json({ error: `Couldn't reach ${AI_PROVIDER_INFO[provider].name} to check the key. Try again in a moment.` }, { status: 502 });
    throw e;
  }
  const row = await saveAiConnection(userId, provider, key, aiKeyHint(key), model);
  return NextResponse.json(publicAiConnection(row), { status: 201 });
}

/** DELETE — forget the key. Copilot falls back to Kitevo's (Pro, monthly cap). */
export async function DELETE() {
  const userId = await creatorId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.aiConnection.deleteMany({ where: { userId } });
  return NextResponse.json({ ok: true });
}
