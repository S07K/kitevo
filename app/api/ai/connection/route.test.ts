import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() }, aiConnection: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn(), deleteMany: vi.fn() } },
}));
vi.mock("@/lib/token-crypto", () => ({ decryptToken: (v: string) => v, encryptToken: (v: string) => `enc(${v})` }));
vi.mock("@/lib/ai/client", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/client")>()), verifyAiKey: vi.fn() }));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { verifyAiKey, AiError } = await import("@/lib/ai/client");
const { GET, POST, DELETE } = await import("./route");

const post = (b: object) => POST(new Request("http://x", { method: "POST", body: JSON.stringify(b) }));
const KEY = "gsk_" + "a".repeat(40) + "WXYZ";
const row = (over: object = {}) => ({ provider: "groq", keyHint: "gsk_…WXYZ", model: null, createdAt: new Date(0), ...over });

describe("/api/ai/connection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1", accountType: "creator" } as never);
    vi.mocked(prisma.aiConnection.upsert).mockImplementation((async (a: { create: object }) => ({ ...row(), ...a.create, createdAt: new Date(0) })) as never);
  });

  it("is for creators only", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: "u1", accountType: "brand" } as never);
    expect((await post({ provider: "groq", key: KEY })).status).toBe(401);
  });

  it("checks the key with the provider, then stores it encrypted and returns only a hint", async () => {
    vi.mocked(verifyAiKey).mockResolvedValueOnce("ok");
    const res = await post({ provider: "groq", key: KEY, model: "qwen/qwen3-32b" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ provider: "groq", keyHint: "gsk_…WXYZ", model: "qwen/qwen3-32b", defaultModel: "llama-3.3-70b-versatile", connectedAt: new Date(0).toISOString() });
    expect(JSON.stringify(body)).not.toContain(KEY);
    expect(vi.mocked(prisma.aiConnection.upsert).mock.calls[0][0]).toMatchObject({ create: { userId: "u1", provider: "groq", keyEncrypted: `enc(${KEY})` } });
  });

  it("refuses bad input before calling the provider", async () => {
    expect(await (await post({ provider: "skynet", key: KEY })).json()).toMatchObject({ field: "provider" });
    expect(await (await post({ provider: "groq", key: "short" })).json()).toMatchObject({ field: "key" });
    expect(await (await post({ provider: "groq", key: KEY, model: "not a model" })).json()).toMatchObject({ field: "model" });
    expect(verifyAiKey).not.toHaveBeenCalled();
  });

  it("rejected keys are 400, an unreachable provider is 502", async () => {
    vi.mocked(verifyAiKey).mockResolvedValueOnce("invalid");
    expect((await post({ provider: "groq", key: KEY })).status).toBe(400);
    vi.mocked(verifyAiKey).mockRejectedValueOnce(new AiError("unavailable", "down"));
    expect((await post({ provider: "groq", key: KEY })).status).toBe(502);
    expect(prisma.aiConnection.upsert).not.toHaveBeenCalled();
  });

  it("can change only the model on the connected provider", async () => {
    vi.mocked(prisma.aiConnection.findUnique).mockResolvedValue(row() as never);
    vi.mocked(prisma.aiConnection.update).mockResolvedValueOnce(row({ model: "llama-3.1-8b-instant" }) as never);
    expect((await post({ provider: "groq", model: "llama-3.1-8b-instant" })).status).toBe(200);
    expect(verifyAiKey).not.toHaveBeenCalled();
    // A different provider always needs its own key.
    expect((await post({ provider: "openai", model: "gpt-4.1" })).status).toBe(400);
  });

  it("GET never returns the key; DELETE forgets it", async () => {
    vi.mocked(prisma.aiConnection.findUnique).mockResolvedValueOnce({ ...row(), keyEncrypted: "enc(secret)" } as never);
    const got = await (await GET()).json();
    expect(JSON.stringify(got)).not.toContain("secret");
    expect((await DELETE()).status).toBe(200);
    expect(prisma.aiConnection.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
  });
});
