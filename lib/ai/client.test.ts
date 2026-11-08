import { describe, it, expect, vi } from "vitest";
import { AiError, complete, creatorAiTarget, kitevoAiTarget, verifyAiKey } from "./client";
import { aiKeyHint, cleanModelId } from "./providers";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("kitevoAiTarget (env)", () => {
  it("is off without a key", () => {
    expect(kitevoAiTarget({ AI_PROVIDER: "groq" } as never)).toBeNull();
  });
  it("defaults to Groq and the provider's default model", () => {
    expect(kitevoAiTarget({ AI_API_KEY: "k" } as never)).toEqual({ provider: "groq", apiKey: "k", model: "llama-3.3-70b-versatile", baseUrl: "https://api.groq.com/openai/v1" });
  });
  it("takes provider, model and a base URL override", () => {
    expect(kitevoAiTarget({ AI_PROVIDER: "OpenRouter", AI_API_KEY: "k", AI_MODEL: "qwen/qwen3:free", AI_BASE_URL: "https://x.test/v1/" } as never)).toEqual({
      provider: "openrouter",
      apiKey: "k",
      model: "qwen/qwen3:free",
      baseUrl: "https://x.test/v1",
    });
  });
  it("custom needs both a base URL and a model; unknown providers are off", () => {
    expect(kitevoAiTarget({ AI_PROVIDER: "custom", AI_API_KEY: "k", AI_BASE_URL: "https://x.test/v1" } as never)).toBeNull();
    expect(kitevoAiTarget({ AI_PROVIDER: "custom", AI_API_KEY: "k", AI_BASE_URL: "https://x.test/v1", AI_MODEL: "m" } as never)?.provider).toBe("custom");
    expect(kitevoAiTarget({ AI_PROVIDER: "skynet", AI_API_KEY: "k" } as never)).toBeNull();
  });
});

describe("complete", () => {
  it("speaks OpenAI chat completions with a bearer key", async () => {
    const f = vi.fn(async () => json({ choices: [{ message: { content: " Hello " } }] }));
    const out = await complete(creatorAiTarget("groq", "gsk_key", null), { system: "S", prompt: "P", maxTokens: 50 }, f as never);
    expect(out).toEqual({ text: "Hello", model: "llama-3.3-70b-versatile" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer gsk_key");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ model: "llama-3.3-70b-versatile", max_tokens: 50, messages: [{ role: "system", content: "S" }, { role: "user", content: "P" }] });
  });

  it("speaks Anthropic messages with x-api-key", async () => {
    const f = vi.fn(async () => json({ content: [{ type: "text", text: "Hi" }, { type: "text", text: " there" }] }));
    const out = await complete(creatorAiTarget("anthropic", "sk-ant-key", "claude-x"), { system: "S", prompt: "P" }, f as never);
    expect(out.text).toBe("Hi there");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.anthropic.com/v1/messages");
    const h = init.headers as Record<string, string>;
    expect(h["x-api-key"]).toBe("sk-ant-key");
    expect(h.Authorization).toBeUndefined();
    expect(JSON.parse(String(init.body))).toMatchObject({ model: "claude-x", system: "S", messages: [{ role: "user", content: "P" }] });
  });

  it("maps provider failures to error codes", async () => {
    const t = creatorAiTarget("openai", "sk-key", null);
    const code = async (res: Response | Error) => {
      const f = vi.fn(async () => {
        if (res instanceof Error) throw res;
        return res;
      });
      try {
        await complete(t, { system: "", prompt: "" }, f as never);
      } catch (e) {
        return e instanceof AiError ? e.code : "other";
      }
      return "none";
    };
    expect(await code(json({}, 401))).toBe("auth");
    expect(await code(json({}, 429))).toBe("rate_limited");
    expect(await code(json({ error: { message: "model not found" } }, 404))).toBe("model");
    expect(await code(json({ error: "The model `x` does not exist" }, 400))).toBe("model");
    expect(await code(json({}, 500))).toBe("unavailable");
    expect(await code(new Error("ECONNRESET"))).toBe("unavailable");
    expect(await code(json({ choices: [{ message: { content: "  " } }] }))).toBe("empty");
  });
});

describe("verifyAiKey", () => {
  it("asks OpenRouter about the key itself (its model list is public)", async () => {
    const f = vi.fn(async () => json({ data: {} }));
    expect(await verifyAiKey("openrouter", "sk-or-key", f as never)).toBe("ok");
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe("https://openrouter.ai/api/v1/key");
  });
  it("lists models elsewhere; 401/403 = invalid, 429 = valid, 5xx throws", async () => {
    const run = (status: number) => verifyAiKey("groq", "gsk_key", vi.fn(async () => json({}, status)) as never);
    expect(await run(200)).toBe("ok");
    expect(await run(429)).toBe("ok");
    expect(await run(401)).toBe("invalid");
    expect(await run(403)).toBe("invalid");
    await expect(run(503)).rejects.toBeInstanceOf(AiError);
  });
});

describe("provider helpers", () => {
  it("hints a key without revealing it", () => {
    expect(aiKeyHint("gsk_abcdefghijklmnopqrstuvwxyz1234")).toBe("gsk_…1234");
    expect(aiKeyHint("sk-or-v1-abcdefghijklmnop9876")).toBe("sk-or-…9876");
    expect(aiKeyHint("AIzaSyAbcdefghijklmnop5555")).toBe("…5555");
  });
  it("accepts model ids, refuses junk", () => {
    expect(cleanModelId("meta-llama/llama-3.3-70b-instruct:free")).toBe("meta-llama/llama-3.3-70b-instruct:free");
    expect(cleanModelId(" gpt-4.1-mini ")).toBe("gpt-4.1-mini");
    expect(cleanModelId("https://evil.test/x y")).toBeNull();
    expect(cleanModelId("")).toBeNull();
    expect(cleanModelId(42)).toBeNull();
  });
});
