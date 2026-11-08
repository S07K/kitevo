import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

vi.mock("@/lib/prisma", () => ({ prisma: { dealPayment: { findUnique: vi.fn() } } }));
vi.mock("@/lib/app-url", () => ({ APP_URL: "https://getkitevo.com" }));
vi.mock("@/lib/deal-access", () => ({ dealForViewer: vi.fn() }));
vi.mock("@/lib/deal-payments", () => ({ startDealPayment: vi.fn() }));
vi.mock("@/lib/payment-connections", () => ({ razorpayKeysFor: vi.fn(), stripeKeyFor: vi.fn(), paypalCredsFor: vi.fn() }));
vi.mock("@/lib/razorpay", async (o) => ({ ...(await o<typeof import("@/lib/razorpay")>()), fetchPayment: vi.fn(), capturePayment: vi.fn() }));
vi.mock("@/lib/stripe-creator", async (o) => ({ ...(await o<typeof import("@/lib/stripe-creator")>()), retrieveCheckoutSession: vi.fn() }));
vi.mock("@/lib/paypal-creator", async (o) => ({ ...(await o<typeof import("@/lib/paypal-creator")>()), getPayPalOrder: vi.fn(), capturePayPalOrder: vi.fn() }));
vi.mock("@/lib/deals", () => ({ markDealPaymentPaid: vi.fn(), brandDealUrl: (t: string) => `https://getkitevo.com/d/${t}` }));

const { prisma } = await import("@/lib/prisma");
const { dealForViewer } = await import("@/lib/deal-access");
const { startDealPayment } = await import("@/lib/deal-payments");
const pc = await import("@/lib/payment-connections");
const rp = await import("@/lib/razorpay");
const sc = await import("@/lib/stripe-creator");
const pp = await import("@/lib/paypal-creator");
const { markDealPaymentPaid } = await import("@/lib/deals");
const pay = await import("./pay/route");
const confirm = await import("./confirm/route");
const stripeReturn = await import("./stripe-return/route");
const paypalReturn = await import("./paypal-return/route");

const params = { params: Promise.resolve({ id: "pay_1" }) };
const row = (o = {}) => ({ id: "pay_1", dealId: "d1", kind: "advance", amountCents: 1250000, currency: "INR", status: "pending", provider: "razorpay", providerOrderId: "order_RP1", deal: { creatorId: "u_c", brandToken: "tok" }, ...o });

describe("deal payment routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.dealPayment.findUnique).mockResolvedValue(row() as never);
  });

  describe("POST pay", () => {
    const post = (b: object) => pay.POST(new Request("http://x", { method: "POST", body: JSON.stringify(b) }), params);
    it("only the brand side may start a payment", async () => {
      vi.mocked(dealForViewer).mockResolvedValueOnce({ deal: {} as never, role: "creator", userId: "u_c" });
      expect((await post({})).status).toBe(404);
      vi.mocked(dealForViewer).mockResolvedValueOnce(null);
      expect((await post({ token: "wrong" })).status).toBe(404);
      expect(startDealPayment).not.toHaveBeenCalled();
    });
    it("passes the chosen provider and returns what the browser needs", async () => {
      vi.mocked(dealForViewer).mockResolvedValue({ deal: {} as never, role: "brand", userId: null });
      vi.mocked(startDealPayment).mockResolvedValue({ kind: "redirect", provider: "stripe", url: "https://checkout.stripe.com/x" });
      const r = await post({ provider: "stripe", token: "tok" });
      expect(startDealPayment).toHaveBeenCalledWith("pay_1", "stripe");
      expect(await r.json()).toEqual({ kind: "redirect", provider: "stripe", url: "https://checkout.stripe.com/x" });
    });
  });

  describe("Razorpay confirm", () => {
    const SECRET = "creator_secret";
    const sig = (o: string, p: string) => createHmac("sha256", SECRET).update(`${o}|${p}`).digest("hex");
    const post = (b: object) => confirm.POST(new Request("http://x", { method: "POST", body: JSON.stringify(b) }), params);
    beforeEach(() => {
      vi.mocked(pc.razorpayKeysFor).mockResolvedValue({ keyId: "rzp_test_abcdefgh12", keySecret: SECRET });
    });
    it("marks paid only for a valid signature and a matching captured payment", async () => {
      vi.mocked(rp.fetchPayment).mockResolvedValue({ id: "pay_x", order_id: "order_RP1", amount: 1250000, currency: "INR", status: "captured" });
      expect((await post({ razorpay_order_id: "order_RP1", razorpay_payment_id: "pay_x", razorpay_signature: sig("order_RP1", "pay_x") })).status).toBe(200);
      expect(markDealPaymentPaid).toHaveBeenCalledWith("pay_1", "razorpay", "pay_x");
    });
    it("refuses forged signatures and wrong amounts", async () => {
      expect((await post({ razorpay_order_id: "order_RP1", razorpay_payment_id: "pay_x", razorpay_signature: sig("order_RP1", "pay_other") })).status).toBe(400);
      vi.mocked(rp.fetchPayment).mockResolvedValue({ id: "pay_x", order_id: "order_RP1", amount: 100, currency: "INR", status: "captured" });
      expect((await post({ razorpay_order_id: "order_RP1", razorpay_payment_id: "pay_x", razorpay_signature: sig("order_RP1", "pay_x") })).status).toBe(400);
      expect(markDealPaymentPaid).not.toHaveBeenCalled();
    });
  });

  describe("Stripe and PayPal returns", () => {
    it("Stripe: verifies the session for this payment, then back to the brand's deal page", async () => {
      vi.mocked(prisma.dealPayment.findUnique).mockResolvedValue(row({ provider: "stripe", providerOrderId: "cs_1", currency: "USD", amountCents: 50000 }) as never);
      vi.mocked(pc.stripeKeyFor).mockResolvedValue("rk_test_x");
      vi.mocked(sc.retrieveCheckoutSession).mockResolvedValue({ id: "cs_1", url: null, status: "complete", payment_status: "paid", amount_total: 50000, currency: "usd", metadata: { kitevo_order_id: "pay_1" }, payment_intent: "pi_1" });
      const r = await stripeReturn.GET(new Request("http://x/?session_id=cs_1"), params);
      expect(r.headers.get("location")).toBe("https://getkitevo.com/d/tok?payment=paid");
      expect(markDealPaymentPaid).toHaveBeenCalledWith("pay_1", "stripe", "pi_1");
      const wrong = await stripeReturn.GET(new Request("http://x/?session_id=cs_other"), params);
      expect(wrong.headers.get("location")).toBe("https://getkitevo.com/d/tok?payment=mismatch");
    });
    it("PayPal: captures an approved order and verifies it", async () => {
      vi.mocked(prisma.dealPayment.findUnique).mockResolvedValue(row({ provider: "paypal", providerOrderId: "PP1", currency: "USD", amountCents: 50000 }) as never);
      vi.mocked(pc.paypalCredsFor).mockResolvedValue({ clientId: "c", secret: "s", env: "sandbox" });
      vi.mocked(pp.getPayPalOrder).mockResolvedValue({ id: "PP1", status: "APPROVED" });
      vi.mocked(pp.capturePayPalOrder).mockResolvedValue({ id: "PP1", status: "COMPLETED", purchase_units: [{ custom_id: "pay_1", payments: { captures: [{ id: "CAP1", status: "COMPLETED", amount: { currency_code: "USD", value: "500.00" } }] } }] });
      const r = await paypalReturn.GET(new Request("http://x/?token=PP1"), params);
      expect(r.headers.get("location")).toBe("https://getkitevo.com/d/tok?payment=paid");
      expect(markDealPaymentPaid).toHaveBeenCalledWith("pay_1", "paypal", "CAP1");
    });
    it("an already-paid payment just goes back as paid, with no provider calls", async () => {
      vi.mocked(prisma.dealPayment.findUnique).mockResolvedValue(row({ provider: "stripe", status: "paid" }) as never);
      const r = await stripeReturn.GET(new Request("http://x/?session_id=cs_1"), params);
      expect(r.headers.get("location")).toBe("https://getkitevo.com/d/tok?payment=paid");
      expect(sc.retrieveCheckoutSession).not.toHaveBeenCalled();
    });
  });
});
