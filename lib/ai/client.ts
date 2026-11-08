import { AI_PROVIDER_INFO, isAiProvider, type AiProvider } from "@/lib/ai/providers";

/**
 * Minimal fetch client for Copilot. Two wire formats:
 *  - OpenAI Chat Completions (Groq, OpenRouter, OpenAI, Gemini's compatibility endpoint, and
 *    any compatible server via AI_BASE_URL)
 *  - Anthropic Messages
 * No SDK. Errors are normalised to AiError codes so callers can say what to fix.
 */

export type AiTarget = {
  /** "custom" = any OpenAI-compatible server (Kitevo's env only; never a creator's URL). */
  provider: AiProvider | "custom";
  apiKey: string;
  model: string;
  baseUrl: string;
};

export type AiErrorCode = "auth" | "rate_limited" | "model" | "unavailable" | "empty";

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const TIMEOUT_MS = 30_000;

/**
 * Kitevo's own key, from env: AI_PROVIDER (groq | openrouter | openai | gemini | anthropic |
 * custom), AI_API_KEY, optional AI_MODEL, and AI_BASE_URL (required for custom). Null when
 * not configured — Copilot then only runs on creators' own keys.
 */
export function kitevoAiTarget(env: NodeJS.ProcessEnv = process.env): AiTarget | null {
  const apiKey = env.AI_API_KEY?.trim();
  const provider = (env.AI_PROVIDER?.trim().toLowerCase() || "groq") as string;
  if (!apiKey) return null;
  const baseOverride = env.AI_BASE_URL?.trim().replace(/\/+$/, "");
  if (provider === "custom") {
    const model = env.AI_MODEL?.trim();
    if (!baseOverride || !model) return null;
    return { provider: "custom", apiKey, model, baseUrl: baseOverride };
  }
  if (!isAiProvider(provider)) return null;
  const info = AI_PROVIDER_INFO[provider];
  return { provider, apiKey, model: env.AI_MODEL?.trim() || info.defaultModel, baseUrl: baseOverride || info.baseUrl };
}

/** A creator's own connection as a target (fixed base URL per provider). */
export function creatorAiTarget(provider: AiProvider, apiKey: string, model: string | null): AiTarget {
  const info = AI_PROVIDER_INFO[provider];
  return { provider, apiKey, model: model || info.defaultModel, baseUrl: info.baseUrl };
}

export type CompletionRequest = { system: string; prompt: string; maxTokens?: number; temperature?: number };
export type CompletionResult = { text: string; model: string };

export async function complete(target: AiTarget, req: CompletionRequest, fetchImpl: typeof fetch = fetch): Promise<CompletionResult> {
  const maxTokens = req.maxTokens ?? 600;
  const temperature = req.temperature ?? 0.7;
  const anthropic = target.provider === "anthropic";
  const url = anthropic ? `${target.baseUrl}/messages` : `${target.baseUrl}/chat/completions`;
  const body = anthropic
    ? { model: target.model, max_tokens: maxTokens, temperature, system: req.system, messages: [{ role: "user", content: req.prompt }] }
    : {
        model: target.model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.prompt },
        ],
      };

  let res: Response;
  try {
    res = await fetchImpl(url, { method: "POST", headers: headersFor(target), body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new AiError("unavailable", "Couldn't reach the AI provider.");
  }
  if (!res.ok) throw errorFor(res.status, await res.text().catch(() => ""));

  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  const text = anthropic ? anthropicText(data) : openAiText(data);
  if (!text.trim()) throw new AiError("empty", "The AI returned nothing. Try again.");
  return { text: text.trim(), model: target.model };
}

/**
 * Check a key with the provider without generating anything: "ok" | "invalid". Throws
 * AiError("unavailable") when the provider can't be reached or errors.
 */
export async function verifyAiKey(provider: AiProvider, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<"ok" | "invalid"> {
  const info = AI_PROVIDER_INFO[provider];
  // OpenRouter's /models is public, so ask about the key itself.
  const url = provider === "openrouter" ? `${info.baseUrl}/key` : `${info.baseUrl}/models`;
  let res: Response;
  try {
    res = await fetchImpl(url, { headers: headersFor({ provider, apiKey, model: "", baseUrl: info.baseUrl }), signal: AbortSignal.timeout(15_000) });
  } catch {
    throw new AiError("unavailable", "Couldn't reach the AI provider.");
  }
  if (res.ok || res.status === 429) return "ok"; // rate-limited still means the key authenticated
  if (res.status === 400 || res.status === 401 || res.status === 403) return "invalid";
  throw new AiError("unavailable", `The AI provider answered ${res.status}.`);
}

function headersFor(t: AiTarget): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t.provider === "anthropic") {
    h["x-api-key"] = t.apiKey;
    h["anthropic-version"] = "2023-06-01";
  } else {
    h.Authorization = `Bearer ${t.apiKey}`;
  }
  if (t.provider === "openrouter") {
    // Optional attribution headers OpenRouter shows in its dashboard.
    h["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL || "https://getkitevo.com";
    h["X-Title"] = "Kitevo Copilot";
  }
  return h;
}

function errorFor(status: number, body: string): AiError {
  if (status === 401 || status === 403) return new AiError("auth", "The AI provider rejected the API key.");
  if (status === 429) return new AiError("rate_limited", "The AI provider is rate-limiting this key. Try again in a minute.");
  if (status === 404 || (status === 400 && /model/i.test(body))) return new AiError("model", "The AI provider doesn't offer this model.");
  return new AiError("unavailable", `The AI provider answered ${status}.`);
}

function openAiText(data: Record<string, unknown> | null): string {
  const choices = data?.choices as Array<{ message?: { content?: unknown } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((p) => (typeof p?.text === "string" ? p.text : "")).join("");
  return "";
}

function anthropicText(data: Record<string, unknown> | null): string {
  const content = data?.content as Array<{ type?: string; text?: unknown }> | undefined;
  return (content ?? []).map((b) => (b.type === "text" && typeof b.text === "string" ? b.text : "")).join("");
}
