import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

vi.mock("@/lib/prisma", () => ({ prisma: { order: { findUnique: vi.fn(), updateMany: vi.fn() }, user: { findUnique: vi.fn() }, booking: { count: vi.fn(async () => 0) } } }));
vi.mock("@/lib/payment-connections", () => ({ razorpayKeysFor: vi.fn() }));
vi.mock("@/lib/razorpay", async (orig) => {
  const real = await orig<typeof import("@/lib/razorpay")>();
  return { ...real, fetchPayment: vi.fn(), capturePayment: vi.fn() };
});
vi.mock("@/lib/background", () => ({ inBackground: vi.fn() }));
vi.mock("@/lib/app-url", () => ({ APP_URL: "https://getkitevo.com" }));
vi.mock("@/lib/email", () => ({ sendDownloadEmail: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

const { prisma } = await import("@/lib/prisma");
const { razorpayKeysFor } = await import("@/lib/payment-connections");
const rp = await import("@/lib/razorpay");
const { inBackground } = await import("@/lib/background");
const { POST } = await import("./route");

const SECRET = "creator_secret_123";
const sign = (o: string, p: string) => createHmac("sha256", SECRET).update(`${o}|${p}`).digest("hex");
const order = (over = {}) => ({ id: "ord_1", provider: "razorpay", providerOrderId: "order_RP1", status: "pending", amountCents: 49900, currency: "INR", sellerId: "u_seller", buyerEmail: "fan@x.com", accessToken: "tok_abcdefghijklmnopqrstuvwx", productId: "p1", product: { title: "Guide" }, ...over });
const post = (b: object) => POST(new Request("http://x", { method: "POST", body: JSON.stringify(b) }), { params: Promise.resolve({ id: "ord_1" }) });
const good = { razorpay_order_id: "order_RP1", razorpay_payment_id: "pay_1", razorpay_signature: sign("order_RP1", "pay_1") };

describe("POST /api/orders/[id]/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order() as never);
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ name: "Sana", username: "sana" } as never);
    vi.mocked(razorpayKeysFor).mockResolvedValue({ keyId: "rzp_test_abcdefgh12", keySecret: SECRET });
    vi.mocked(rp.fetchPayment).mockResolvedValue({ id: "pay_1", order_id: "order_RP1", amount: 49900, currency: "INR", status: "captured" });
  });

  it("marks a verified, matching, captured payment as paid and emails the link once", async () => {
    const res = await post(good);
    expect(res.status).toBe(200);
    expect((await res.json()).accessUrl).toMatch(/\/o\/tok_abcdefghijklmnopqrstuvwx$/);
    expect(prisma.order.updateMany).toHaveBeenCalledWith({ where: { id: "ord_1", status: "pending" }, data: { status: "paid", providerRef: "pay_1" } });
    expect(inBackground).toHaveBeenCalledTimes(1);
  });

  it("refuses a forged signature without touching the order", async () => {
    const res = await post({ ...good, razorpay_signature: sign("order_RP1", "pay_OTHER") });
    expect(res.status).toBe(400);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it("refuses a payment for a different amount, currency or order", async () => {
    for (const p of [{ amount: 100 }, { currency: "USD" }, { order_id: "order_OTHER" }]) {
      vi.mocked(rp.fetchPayment).mockResolvedValueOnce({ id: "pay_1", order_id: "order_RP1", amount: 49900, currency: "INR", status: "captured", ...p });
      expect((await post(good)).status).toBe(400);
    }
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it("captures an authorized-only payment before granting access", async () => {
    vi.mocked(rp.fetchPayment).mockResolvedValue({ id: "pay_1", order_id: "order_RP1", amount: 49900, currency: "INR", status: "authorized" });
    vi.mocked(rp.capturePayment).mockResolvedValue({ id: "pay_1", order_id: "order_RP1", amount: 49900, currency: "INR", status: "captured" });
    expect((await post(good)).status).toBe(200);
    expect(rp.capturePayment).toHaveBeenCalledWith(expect.anything(), "pay_1", 49900, "INR");
  });

  it("is idempotent: an already-paid order returns its link and sends nothing", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order({ status: "paid" }) as never);
    const res = await post(good);
    expect(res.status).toBe(200);
    expect(rp.fetchPayment).not.toHaveBeenCalled();
    expect(inBackground).not.toHaveBeenCalled();
  });

  it("a second concurrent confirmation doesn't email twice", async () => {
    vi.mocked(prisma.order.updateMany).mockResolvedValue({ count: 0 } as never);
    expect((await post(good)).status).toBe(200);
    expect(inBackground).not.toHaveBeenCalled();
  });
});
