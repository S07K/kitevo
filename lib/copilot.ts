import { prisma } from "@/lib/prisma";
import { APP_URL } from "@/lib/app-url";
import { decryptToken, encryptToken } from "@/lib/token-crypto";
import { AiError, complete, creatorAiTarget, kitevoAiTarget, type AiTarget } from "@/lib/ai/client";
import { AI_PROVIDER_INFO, isAiProvider, type AiProvider } from "@/lib/ai/providers";
import { creatorPlanId } from "@/lib/creator-plan";
import { parseManualStats } from "@/lib/manual-stats";
import { normalizeRates, publicRateItems } from "@/lib/kit-rates";
import { statFacts, suggestRates } from "@/lib/copilot-stats";
import { THREAD_CONTEXT, bioPrompt, cleanOutput, inquiryReplyPrompt, messagePrompt, pitchPrompt, type CopilotPrompt, type CopilotTask, type CreatorFacts } from "@/lib/copilot-prompts";
import { trackEvent } from "@/lib/analytics";
import type { LiveKitStats } from "@/lib/kit-stats-compose";

/**
 * Copilot (PLAN.md R4): AI drafts grounded in the creator's real kit.
 *
 * Whose key runs it:
 *  - the creator's own AI connection (Connectors → AI), on every plan, no Kitevo cap;
 *  - else Kitevo's key (AI_PROVIDER / AI_API_KEY), Pro only, COPILOT_MONTHLY_LIMIT per
 *    calendar month (UTC), counted in CopilotUsage.
 * Nothing is sent to any AI provider until one of those exists.
 */

export const DEFAULT_MONTHLY_LIMIT = 50;

export function monthlyLimit(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.COPILOT_MONTHLY_LIMIT);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_MONTHLY_LIMIT;
}

export type CopilotBlock = "plan_required" | "limit_reached" | "not_configured";

export type CopilotAccess =
  | { ok: true; source: "own"; target: AiTarget; provider: AiProvider }
  | { ok: true; source: "kitevo"; target: AiTarget; used: number; limit: number }
  | { ok: false; reason: CopilotBlock; limit?: number; hasOwnKeyOption: true };

/** Public shape for the client (never the key). */
export type CopilotStatus =
  | { ok: true; source: "own"; provider: AiProvider; providerName: string }
  | { ok: true; source: "kitevo"; remaining: number; limit: number }
  | { ok: false; reason: CopilotBlock; limit?: number };

function monthStart(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function copilotAccess(userId: string): Promise<CopilotAccess> {
  const own = await prisma.aiConnection.findUnique({ where: { userId } });
  if (own && isAiProvider(own.provider)) {
    const key = decryptToken(own.keyEncrypted);
    if (key) return { ok: true, source: "own", target: creatorAiTarget(own.provider, key, own.model), provider: own.provider };
  }
  const target = kitevoAiTarget();
  if (!target) return { ok: false, reason: "not_configured", hasOwnKeyOption: true };
  if ((await creatorPlanId(userId)) !== "pro") return { ok: false, reason: "plan_required", hasOwnKeyOption: true };
  const limit = monthlyLimit();
  const used = await prisma.copilotUsage.count({ where: { userId, source: "kitevo", createdAt: { gte: monthStart() } } });
  if (used >= limit) return { ok: false, reason: "limit_reached", limit, hasOwnKeyOption: true };
  return { ok: true, source: "kitevo", target, used, limit };
}

export function publicStatus(a: CopilotAccess): CopilotStatus {
  if (!a.ok) return { ok: false, reason: a.reason, limit: a.limit };
  if (a.source === "own") return { ok: true, source: "own", provider: a.provider, providerName: AI_PROVIDER_INFO[a.provider].name };
  return { ok: true, source: "kitevo", remaining: Math.max(0, a.limit - a.used), limit: a.limit };
}

// ─── Facts ─────────────────────────────────────────────────────────────────────

const parseJson = <T>(raw: string | null | undefined, fallback: T): T => {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** The kit Copilot reads: the given one if the creator owns it, else their first public kit. */
async function kitFor(userId: string, kitId?: string | null) {
  const select = { id: true, slug: true, manualStats: true, rates: true, brands: true, passwordHash: true } as const;
  if (kitId) {
    const k = await prisma.kit.findFirst({ where: { id: kitId, userId }, select });
    if (k) return k;
  }
  return (
    (await prisma.kit.findFirst({ where: { userId, passwordHash: null }, orderBy: { createdAt: "asc" }, select })) ??
    (await prisma.kit.findFirst({ where: { userId }, orderBy: { createdAt: "asc" }, select }))
  );
}

/** Live stats exactly as the kit shows them (Starter+ only, same loader as the public page). */
async function liveStats(userId: string): Promise<LiveKitStats> {
  try {
    const { loadKitViewData } = await import("@/lib/kit-view-data");
    return (await loadKitViewData(userId)).live;
  } catch (e) {
    console.error("[copilot] live stats failed:", e);
    return {};
  }
}

export async function creatorFacts(userId: string, kitId?: string | null): Promise<{ facts: CreatorFacts; kit: Awaited<ReturnType<typeof kitFor>>; live: LiveKitStats; niches: string[] }> {
  const [user, kit, live] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, bio: true, location: true, niches: true } }),
    kitFor(userId, kitId),
    liveStats(userId),
  ]);
  const niches = parseJson<unknown>(user?.niches, []);
  const nicheList = Array.isArray(niches) ? niches.filter((n): n is string => typeof n === "string") : [];
  const manual = parseManualStats(kit?.manualStats);
  const rates = kit ? publicRateItems(normalizeRates(parseJson(kit.rates, {}))) : [];
  const brands = kit ? parseJson<unknown>(kit.brands, []) : [];
  const facts: CreatorFacts = {
    name: user?.name?.trim() || "the creator",
    location: user?.location?.trim() || null,
    niches: nicheList,
    bio: user?.bio ?? "",
    kitUrl: kit && !kit.passwordHash ? `${APP_URL}/kit/${kit.slug}` : null,
    stats: statFacts(manual, live),
    rates: rates.map((r) => ({ label: r.label, price: r.price })),
    brandPartners: (Array.isArray(brands) ? brands : [])
      .map((b) => (b && typeof b === "object" && typeof (b as { name?: unknown }).name === "string" ? (b as { name: string }).name.trim() : ""))
      .filter(Boolean)
      .slice(0, 8),
  };
  return { facts, kit, live, niches: nicheList };
}

export async function rateSuggestion(userId: string, kitId?: string | null) {
  const { kit, live, niches } = await creatorFacts(userId, kitId);
  return suggestRates(parseManualStats(kit?.manualStats), live, niches);
}

// ─── Generate ──────────────────────────────────────────────────────────────────

export class CopilotError extends Error {
  constructor(
    public code: CopilotBlock | "not_found" | "bad_input" | "ai_auth" | "ai_rate_limited" | "ai_model" | "ai_unavailable",
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type CopilotInput = { task: CopilotTask; kitId?: string | null; campaignId?: string | null; inquiryId?: string | null; conversationId?: string | null };

async function buildPrompt(userId: string, input: CopilotInput): Promise<CopilotPrompt> {
  const { facts } = await creatorFacts(userId, input.kitId);
  if (input.task === "bio") return bioPrompt(facts);
  if (input.task === "pitch") {
    if (!input.campaignId) throw new CopilotError("bad_input", "Missing campaign.");
    const c = await prisma.campaign.findUnique({
      where: { id: input.campaignId },
      select: { title: true, description: true, niche: true, budget: true, status: true, brand: { select: { name: true, brandProfile: { select: { companyName: true } } } } },
    });
    if (!c || c.status === "draft") throw new CopilotError("not_found", "Campaign not found.", 404);
    return pitchPrompt(facts, { brandName: c.brand.brandProfile?.companyName || c.brand.name || "the brand", title: c.title, description: c.description, niche: c.niche, budget: c.budget });
  }
  if (input.task === "message") {
    if (!input.conversationId) throw new CopilotError("bad_input", "Missing conversation.");
    // Only my own threads, only with a brand, and not across a block.
    const me = await prisma.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId: input.conversationId, userId } }, select: { id: true } });
    const other = me
      ? await prisma.conversationParticipant.findFirst({
          where: { conversationId: input.conversationId, userId: { not: userId } },
          select: { userId: true, user: { select: { name: true, accountType: true, brandProfile: { select: { companyName: true } } } } },
        })
      : null;
    if (!other) throw new CopilotError("not_found", "Conversation not found.", 404);
    const { isBlocked } = await import("@/lib/safety");
    if (await isBlocked(userId, other.userId)) throw new CopilotError("bad_input", "You can't message this account.", 403);
    const rows = await prisma.message.findMany({
      where: { conversationId: input.conversationId },
      orderBy: { createdAt: "desc" },
      take: THREAD_CONTEXT,
      select: { senderId: true, body: true, createdAt: true },
    });
    return messagePrompt(facts, {
      brandName: other.user.brandProfile?.companyName || other.user.name || "the brand",
      messages: rows.reverse().map((m) => ({ mine: m.senderId === userId, body: m.body, at: m.createdAt })),
    });
  }
  if (!input.inquiryId) throw new CopilotError("bad_input", "Missing inquiry.");
  const q = await prisma.inquiry.findFirst({ where: { id: input.inquiryId, kit: { userId } }, select: { name: true, company: true, message: true } });
  if (!q) throw new CopilotError("not_found", "Inquiry not found.", 404);
  return inquiryReplyPrompt(facts, { fromName: q.name, company: q.company, message: q.message });
}

const BLOCK_MESSAGE: Record<CopilotBlock, string> = {
  not_configured: "Copilot needs an AI key. Connect your own in Connectors to use it now.",
  plan_required: "Copilot is included in Pro. Or connect your own AI key in Connectors to use it on any plan.",
  limit_reached: "You've used this month's Copilot drafts. Connect your own AI key in Connectors to keep going.",
};

export async function generate(userId: string, input: CopilotInput): Promise<{ text: string; status: CopilotStatus }> {
  const access = await copilotAccess(userId);
  if (!access.ok) throw new CopilotError(access.reason, BLOCK_MESSAGE[access.reason], 403);
  const prompt = await buildPrompt(userId, input);
  let text: string;
  try {
    text = cleanOutput((await complete(access.target, prompt)).text, input.task);
  } catch (e) {
    if (e instanceof AiError) {
      const own = access.source === "own";
      if (e.code === "auth") throw new CopilotError("ai_auth", own ? "Your AI provider rejected your key. Update it in Connectors." : "Copilot's AI key isn't working right now. Try again later.", 502);
      if (e.code === "rate_limited") throw new CopilotError("ai_rate_limited", own ? "Your AI provider is rate-limiting your key. Try again in a minute." : "Copilot is busy. Try again in a minute.", 429);
      if (e.code === "model") throw new CopilotError("ai_model", own ? "Your AI provider doesn't offer the model you set. Change it in Connectors." : "Copilot's model isn't available right now.", 502);
      throw new CopilotError("ai_unavailable", "Couldn't get a draft right now. Try again.", 502);
    }
    throw e;
  }
  await prisma.copilotUsage.create({ data: { userId, task: input.task, source: access.source } });
  await trackEvent("copilot_used", { userId, props: { task: input.task, source: access.source } });
  const status: CopilotStatus =
    access.source === "own" ? publicStatus(access) : { ok: true, source: "kitevo", remaining: Math.max(0, access.limit - access.used - 1), limit: access.limit };
  return { text, status };
}

// ─── Connection ────────────────────────────────────────────────────────────────

export function publicAiConnection(row: { provider: string; keyHint: string; model: string | null; createdAt: Date } | null) {
  if (!row || !isAiProvider(row.provider)) return null;
  return { provider: row.provider, keyHint: row.keyHint, model: row.model, defaultModel: AI_PROVIDER_INFO[row.provider].defaultModel, connectedAt: row.createdAt.toISOString() };
}

export async function saveAiConnection(userId: string, provider: AiProvider, key: string, keyHint: string, model: string | null) {
  const data = { provider, keyEncrypted: encryptToken(key), keyHint, model };
  return prisma.aiConnection.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}
