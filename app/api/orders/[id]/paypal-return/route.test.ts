import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: { order: { findUnique: vi.fn() } } }));
vi.mock("@/lib/app-url", () => ({ APP_URL: "https://getkitevo.com" }));
vi.mock("@/lib/payment-connections", () => ({ paypalCredsFor: vi.fn() }));
vi.mock("@/lib/paypal-creator", async (orig) => ({ ...(await orig<typeof import("@/lib/paypal-creator")>()), getPayPalOrder: vi.fn(), capturePayPalOrder: vi.fn() }));
vi.mock("@/lib/paid-orders", () => ({ markOrderPaid: vi.fn(), orderAccessUrl: (t: string) => `https://getkitevo.com/o/${t}` }));

const { prisma } = await import("@/lib/prisma");
const { paypalCredsFor } = await import("@/lib/payment-connections");
const pp = await import("@/lib/paypal-creator");
const { markOrderPaid } = await import("@/lib/paid-orders");
const { GET } = await import("./route");

const order = (o = {}) => ({ id: "ord_1", provider: "paypal", status: "pending", providerOrderId: "PP1", sellerId: "u", productId: "p1", amountCents: 1950, currency: "USD", accessToken: "tok", product: { title: "Guide" }, ...o });
const completed = (o: { custom?: string; value?: string; currency?: string } = {}) => ({
  id: "PP1",
  status: "COMPLETED" as const,
  purchase_units: [{ custom_id: o.custom ?? "ord_1", payments: { captures: [{ id: "CAP1", status: "COMPLETED", amount: { currency_code: o.currency ?? "USD", value: o.value ?? "19.50" } }] } }],
});
const get = (token = "PP1") => GET(new Request(`https://getkitevo.com/api/orders/ord_1/paypal-return?token=${token}&PayerID=X`), { params: Promise.resolve({ id: "ord_1" }) });
const loc = async (token?: string) => (await get(token)).headers.get("location");

describe("GET /api/orders/[id]/paypal-return", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.order.findUnique).mockResolvedValue(order() as never);
    vi.mocked(paypalCredsFor).mockResolvedValue({ clientId: "c", secret: "s", env: "sandbox" });
  });

  it("captures an approved order, verifies it and opens the download page", async () => {
    vi.mocked(pp.getPayPalOrder).mockResolvedValue({ id: "PP1", status: "APPROVED" });
    vi.mocked(pp.capturePayPalOrder).mockResolvedValue(completed());
    expect(await loc()).toBe("https://getkitevo.com/o/tok");
    expect(pp.capturePayPalOrder).toHaveBeenCalledWith(expect.anything(), "PP1", "ord_1");
    expect(markOrderPaid).toHaveBeenCalledWith(expect.objectContaining({ id: "ord_1" }), "CAP1");
  });

  it("doesn't capture twice when PayPal already shows it completed", async () => {
    vi.mocked(pp.getPayPalOrder).mockResolvedValue(completed());
    expect(await loc()).toBe("https://getkitevo.com/o/tok");
    expect(pp.capturePayPalOrder).not.toHaveBeenCalled();
  });

  it("never trusts the URL: another order, amount or currency goes back to the product", async () => {
    for (const c of [completed({ custom: "ord_9" }), completed({ value: "1.00" }), completed({ currency: "EUR" })]) {
      vi.mocked(pp.getPayPalOrder).mockResolvedValueOnce(c);
      expect(await loc()).toBe("https://getkitevo.com/p/p1?checkout=mismatch");
    }
    expect(await loc("PP_OTHER")).toBe("https://getkitevo.com/p/p1?checkout=mismatch");
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("not yet approved or a PayPal error → processing, nothing marked", async () => {
    vi.mocked(pp.getPayPalOrder).mockResolvedValueOnce({ id: "PP1", status: "PAYER_ACTION_REQUIRED" });
    expect(await loc()).toBe("https://getkitevo.com/p/p1?checkout=processing");
    vi.mocked(pp.getPayPalOrder).mockRejectedValueOnce(new Error("down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await loc()).toBe("https://getkitevo.com/p/p1?checkout=processing");
    expect(markOrderPaid).not.toHaveBeenCalled();
  });

  it("an already-paid order just redirects; a disconnected account says unavailable", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(order({ status: "paid" }) as never);
    expect(await loc()).toBe("https://getkitevo.com/o/tok");
    vi.mocked(paypalCredsFor).mockResolvedValueOnce(null);
    expect(await loc()).toBe("https://getkitevo.com/p/p1?checkout=unavailable");
    expect(pp.getPayPalOrder).not.toHaveBeenCalled();
  });

  it("ignores orders that aren't PayPal", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValueOnce(order({ provider: "stripe" }) as never);
    expect(await loc()).toBe("https://getkitevo.com/");
  });
});
