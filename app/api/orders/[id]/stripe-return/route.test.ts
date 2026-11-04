import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { order: { findUnique: vi.fn() } } }));
vi.mock("@/lib/app-url", () => ({ APP_URL: "https://getkitevo.com" }));
vi.mock("@/lib/payment-connections", () => ({ stripeKeyFor: vi.fn() }));
vi.mock("@/lib/stripe-creator", async (orig) => ({ ...(await orig<typeof import("@/lib/stripe-creator")>()), retrieveCheckoutSession: vi.fn() }));
vi.mock("@/lib/paid-orders", () => ({ markOrderPaid: vi.fn(), orderAccessUrl: (t: string) => `https://getkitevo.com/o/${t}` }));

const { prisma } = await import("@/lib/prisma");
const { stripeKeyFor } = await import("@/lib/payment-connections");
const { retrieveCheckoutSession } = await import("@/lib/stripe-creator");
const { markOrderPaid } = await import("@/lib/paid-orders");
const { GET } = await import("./route");

const order = (o = {}) => ({ id: "ord_1", provider: "stripe", status: "pending", providerOrderId: "cs_1", sellerId: "u", productId: "p1", amountCents: 1900, currency: "USD", accessToken: "tok", product: { title: "Guide" }, ...o });
const session = (o = {}) => ({ id: "cs_1", url: null, status: "complete" as const, payment_status: "paid" as const, amount_total: 1900, currency: "usd", metadata: { kitevo_order_id: "ord_1" }, payment_intent: "pi_1", ...o });
const get = (sid = "cs_1") => GET(new Request(`https://getkitevo.com/api/orders/ord_1/stripe-return?session_id=${sid}`), { params: Promise.resolve({ id: "ord_1" }) });

describe("GET /api/orders/[id]/stripe-return", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order() as never);
    vi.mocked(stripeKeyFor).mockResolvedValue("rk_test_key");
    vi.mocked(retrieveCheckoutSession).mockResolvedValue(session());
  });

  it("verifies the session with Stripe, marks the order paid and opens the download page", async () => {
    const res = await get();
    expect(res.headers.get("location")).toBe("https://getkitevo.com/o/tok");
    expect(markOrderPaid).toHaveBeenCalledWith(expect.objectContaining({ id: "ord_1" }), "pi_1");
  });

  it("never trusts the URL: another order's session, unpaid or wrong amount goes back to the product", async () => {
    for (const s of [session({ metadata: { kitevo_order_id: "ord_9" } }), session({ payment_status: "unpaid" as never }), session({ amount_total: 1 })]) {
      vi.mocked(retrieveCheckoutSession).mockResolvedValueOnce(s);
      expect((await get()).headers.get("location")).toMatch(/^https:\/\/getkitevo\.com\/p\/p1\?checkout=/);
    }
    expect((await get("cs_other")).headers.get("location")).toBe("https://getkitevo.com/p/p1?checkout=mismatch");
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("an already-paid order just redirects to its page", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order({ status: "paid" }) as never);
    expect((await get()).headers.get("location")).toBe("https://getkitevo.com/o/tok");
    expect(retrieveCheckoutSession).not.toHaveBeenCalled();
  });
});
