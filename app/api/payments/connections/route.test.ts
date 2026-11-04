import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() }, paymentConnection: { findMany: vi.fn(), deleteMany: vi.fn() } } }));
vi.mock("@/lib/razorpay", async (orig) => ({ ...(await orig<typeof import("@/lib/razorpay")>()), verifyKeys: vi.fn() }));
vi.mock("@/lib/stripe-creator", async (orig) => ({ ...(await orig<typeof import("@/lib/stripe-creator")>()), verifyRestrictedKey: vi.fn() }));
vi.mock("@/lib/paypal-creator", async (orig) => ({ ...(await orig<typeof import("@/lib/paypal-creator")>()), detectPayPalEnv: vi.fn() }));
vi.mock("@/lib/payment-connections", async (orig) => ({
  ...(await orig<typeof import("@/lib/payment-connections")>()),
  saveRazorpayConnection: vi.fn(async (_u: string, k: string, _s: string, live: boolean) => ({ provider: "razorpay", publicKey: k, livemode: live, createdAt: new Date(0) })),
  saveStripeConnection: vi.fn(async (_u: string, _k: string, hint: string, live: boolean) => ({ provider: "stripe", publicKey: hint, livemode: live, createdAt: new Date(0) })),
  savePayPalConnection: vi.fn(async (_u: string, id: string, _s: string, env: string) => ({ provider: "paypal", publicKey: id, livemode: env === "live", createdAt: new Date(0) })),
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { verifyKeys } = await import("@/lib/razorpay");
const { verifyRestrictedKey } = await import("@/lib/stripe-creator");
const { detectPayPalEnv } = await import("@/lib/paypal-creator");
const pc = await import("@/lib/payment-connections");
const { GET, POST, DELETE } = await import("./route");

const post = (b: object) => POST(new Request("http://x", { method: "POST", body: JSON.stringify(b) }));
const RZP = { provider: "razorpay", keyId: "rzp_test_ABCdef12345678", keySecret: "secret_value_123" };
const RK = "rk_test_" + "A".repeat(40);
const PP = { provider: "paypal", clientId: "A".repeat(60), secret: "E".repeat(60) };

describe("/api/payments/connections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1", accountType: "creator" } as never);
  });

  it("requires a signed-in creator (brands can't connect)", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null as never);
    expect((await post(RZP)).status).toBe(401);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: "u1", accountType: "brand" } as never);
    expect((await post(RZP)).status).toBe(401);
  });

  it("refuses unknown providers", async () => {
    expect((await post({ provider: "venmo" })).status).toBe(400);
  });

  describe("Razorpay", () => {
    it("checks the key id shape and the secret before calling Razorpay", async () => {
      expect(await (await post({ ...RZP, keyId: "sk_live_x" })).json()).toMatchObject({ field: "keyId" });
      expect(await (await post({ ...RZP, keySecret: "short" })).json()).toMatchObject({ field: "keySecret" });
      expect(verifyKeys).not.toHaveBeenCalled();
    });
    it("refuses keys Razorpay rejects, 502 when unreachable, saves good keys", async () => {
      vi.mocked(verifyKeys).mockResolvedValueOnce(false);
      expect((await post(RZP)).status).toBe(400);
      vi.mocked(verifyKeys).mockRejectedValueOnce(new Error("down"));
      expect((await post(RZP)).status).toBe(502);
      vi.mocked(verifyKeys).mockResolvedValueOnce(true);
      const res = await post(RZP);
      expect(res.status).toBe(201);
      expect(await res.json()).toMatchObject({ provider: "razorpay", livemode: false });
      expect(pc.saveRazorpayConnection).toHaveBeenCalledWith("u1", RZP.keyId, RZP.keySecret, false);
    });
  });

  describe("Stripe", () => {
    it("refuses full secret keys with an explanation", async () => {
      const r = await post({ provider: "stripe", key: "sk_live_" + "A".repeat(30) });
      expect(r.status).toBe(400);
      expect((await r.json()).error).toMatch(/restricted key/);
    });
    it("maps invalid / missing permission / unreachable, and saves only a hint", async () => {
      vi.mocked(verifyRestrictedKey).mockResolvedValueOnce("invalid");
      expect((await post({ provider: "stripe", key: RK })).status).toBe(400);
      vi.mocked(verifyRestrictedKey).mockResolvedValueOnce("permission");
      expect((await (await post({ provider: "stripe", key: RK })).json()).error).toMatch(/Checkout Sessions/);
      vi.mocked(verifyRestrictedKey).mockRejectedValueOnce(new Error("down"));
      expect((await post({ provider: "stripe", key: RK })).status).toBe(502);
      vi.mocked(verifyRestrictedKey).mockResolvedValueOnce("ok");
      const res = await post({ provider: "stripe", key: RK });
      expect(res.status).toBe(201);
      expect((await res.json()).keyHint).toBe("rk_test_…AAAA");
    });
  });

  describe("PayPal", () => {
    it("checks credential shape, then lets PayPal decide live vs sandbox", async () => {
      expect(await (await post({ ...PP, clientId: "x" })).json()).toMatchObject({ field: "clientId" });
      vi.mocked(detectPayPalEnv).mockResolvedValueOnce(null);
      expect(await (await post(PP)).json()).toMatchObject({ field: "secret" });
      vi.mocked(detectPayPalEnv).mockRejectedValueOnce(new Error("down"));
      expect((await post(PP)).status).toBe(502);
      vi.mocked(detectPayPalEnv).mockResolvedValueOnce("sandbox");
      const res = await post(PP);
      expect(res.status).toBe(201);
      expect(await res.json()).toMatchObject({ provider: "paypal", livemode: false, keyHint: "AAAAAA…AAAA" });
      expect(pc.savePayPalConnection).toHaveBeenCalledWith("u1", PP.clientId, PP.secret, "sandbox");
    });
  });

  it("GET never returns secrets", async () => {
    vi.mocked(prisma.paymentConnection.findMany).mockResolvedValue([{ provider: "razorpay", publicKey: "rzp_test_ABCdef12345678", secretEncrypted: "enc:v1:xyz", livemode: false, createdAt: new Date(0) }] as never);
    const body = JSON.stringify(await (await GET()).json());
    expect(body).not.toContain("enc:v1");
    expect(body).toContain("rzp_test_…5678");
  });

  it("DELETE only for known providers, scoped to the signed-in user", async () => {
    expect((await DELETE(new Request("http://x?provider=venmo"))).status).toBe(400);
    expect((await DELETE(new Request("http://x?provider=paypal"))).status).toBe(200);
    expect(prisma.paymentConnection.deleteMany).toHaveBeenCalledWith({ where: { userId: "u1", provider: "paypal" } });
  });
});
