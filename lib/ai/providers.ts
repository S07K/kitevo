import type { BrandIconId } from "@/lib/brand-icons";

/**
 * AI providers Copilot can run on — Kitevo's own key (env) or a creator's key (Connectors).
 * Client-safe metadata only. All but Anthropic speak the OpenAI Chat Completions format, so
 * one fetch client covers them (lib/ai/client.ts); no provider SDK is installed.
 */
export const AI_PROVIDERS = ["groq", "openrouter", "openai", "gemini", "anthropic"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export type AiProviderInfo = {
  name: string;
  icon: BrandIconId;
  /**
   * Used when no model is set; any model id works. Groq and OpenRouter default to OpenAI's
   * open-weight gpt-oss-120b (free tier on Groq, fractions of a cent per draft on OpenRouter).
   */
  defaultModel: string;
  /** OpenAI-compatible base URL (Anthropic uses its own Messages API). */
  baseUrl: string;
  /** Where to create a key. */
  keysUrl: string;
  /** One line for the connect dialog. */
  hint: string;
};

export const AI_PROVIDER_INFO: Record<AiProvider, AiProviderInfo> = {
  groq: {
    name: "Groq",
    icon: "groq",
    defaultModel: "openai/gpt-oss-120b",
    baseUrl: "https://api.groq.com/openai/v1",
    keysUrl: "https://console.groq.com/keys",
    hint: "Fast open models (gpt-oss, Llama, Qwen) with a free tier.",
  },
  openrouter: {
    name: "OpenRouter",
    icon: "openrouter",
    defaultModel: "openai/gpt-oss-120b",
    baseUrl: "https://openrouter.ai/api/v1",
    keysUrl: "https://openrouter.ai/settings/keys",
    hint: "One key for hundreds of models, open and closed, some free (ids ending in :free).",
  },
  openai: {
    name: "OpenAI",
    icon: "openai",
    defaultModel: "gpt-4.1-mini",
    baseUrl: "https://api.openai.com/v1",
    keysUrl: "https://platform.openai.com/api-keys",
    hint: "GPT models, billed to your OpenAI account.",
  },
  gemini: {
    name: "Google Gemini",
    icon: "gemini",
    defaultModel: "gemini-2.5-flash",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    keysUrl: "https://aistudio.google.com/apikey",
    hint: "Gemini models with a free tier in Google AI Studio.",
  },
  anthropic: {
    name: "Anthropic",
    icon: "anthropic",
    defaultModel: "claude-haiku-5-5",
    baseUrl: "https://api.anthropic.com/v1",
    keysUrl: "https://console.anthropic.com/settings/keys",
    hint: "Claude models, billed to your Anthropic account.",
  },
};

export function isAiProvider(v: unknown): v is AiProvider {
  return typeof v === "string" && (AI_PROVIDERS as readonly string[]).includes(v);
}

/** "gsk_…AbCd" — enough to recognise a key, never enough to use it. */
export function aiKeyHint(key: string): string {
  const k = key.trim();
  const prefix = k.match(/^[A-Za-z]+[-_](?:[A-Za-z0-9]+[-_])?/)?.[0] ?? "";
  return `${prefix.slice(0, 12)}…${k.slice(-4)}`;
}

/** Model ids: provider/name:tag style, no spaces or URLs. */
export function cleanModelId(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = v.trim();
  return m && m.length <= 120 && /^[A-Za-z0-9._:/@-]+$/.test(m) ? m : null;
}
