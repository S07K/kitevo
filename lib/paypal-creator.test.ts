import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { approvalUrl, capturePayPalOrder, createPayPalOrder, detectPayPalEnv, parsePayPalCreds, paypalPaysFor, paypalSupports, toPayPalAmount, type PayPalOrder } from "./paypal-creator";

const ID = "A".repeat(60), SECRET = "E".repeat(60);
const creds = { clientId: ID, secret: SECRET, env: "sandbox" as const };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("parsing and amounts", () => {
  it("accepts REST app credentials and refuses junk", () => {
    expect(parsePayPalCreds(` ${ID} `, SECRET)).toEqual({ clientId: ID, secret: SECRET });
    expect(parsePayPalCreds("short", SECRET)).toBeNull();
    expect(parsePayPalCreds(ID, "has spaces in it ".repeat(4))).toBeNull();
    expect(parsePayPalCreds(undefined, undefined)).toBeNull();
  });
  it("formats minor units as PayPal decimals", () => {
    expect([toPayPalAmount(1950), toPayPalAmount(100), toPayPalAmount(1)]).toEqual(["19.50", "1.00", "0.01"]);
  });
  it("only supports currencies PayPal can take for creators (no INR)", () => {
    expect(paypalSupports("USD")).toBe(true);
    expect(paypalSupports("inr")).toBe(false);
  });
});

describe("paypalPaysFor", () => {
  const order = { id: "ord_1", amountCents: 1950, currency: "USD" };
  const o = (over: Partial<PayPalOrder> = {}, cap: Record<string, unknown> = {}): PayPalOrder => ({
    id: "PP1",
    status: "COMPLETED",
    purchase_units: [{ custom_id: "ord_1", payments: { captures: [{ id: "CAP1", status: "COMPLETED", amount: { currency_code: "USD", value: "19.50" }, ...cap }] } }],
    ...over,
  });
  it("returns the capture id for a completed capture of this order and amount", () => expect(paypalPaysFor(o(), order)).toBe("CAP1"));
  it.each([
    ["not completed", o({ status: "APPROVED" })],
    ["another order", o({ purchase_units: [{ custom_id: "ord_9", payments: { captures: [{ id: "C", status: "COMPLETED", amount: { currency_code: "USD", value: "19.50" } }] } }] })],
    ["wrong amount", o({}, { amount: { currency_code: "USD", value: "1.00" } })],
    ["wrong currency", o({}, { amount: { currency_code: "EUR", value: "19.50" } })],
    ["capture pending", o({}, { status: "PENDING" })],
    ["no units", o({ purchase_units: [] })],
  ])("refuses %s", (_n, x) => expect(paypalPaysFor(x, order)).toBeNull());
});

describe("API calls (mocked fetch)", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects live vs sandbox credentials, or neither", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { error_description: "bad" })).mockResolvedValueOnce(json(200, { access_token: "t" }));
    expect(await detectPayPalEnv(creds)).toBe("sandbox");
    expect(fetchMock.mock.calls[0][0]).toBe("https://api-m.paypal.com/v1/oauth2/token");
    fetchMock.mockResolvedValue(json(401, {}));
    expect(await detectPayPalEnv(creds)).toBeNull();
  });

  it("creates an order with the product's amount and an idempotency key", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { access_token: "t" })).mockResolvedValueOnce(json(201, { id: "PP1", status: "PAYER_ACTION_REQUIRED", links: [{ rel: "payer-action", href: "https://www.sandbox.paypal.com/checkoutnow?token=PP1" }] }));
    const o = await createPayPalOrder(creds, { orderId: "ord_1", title: "Guide", amount: 1950, currency: "usd", returnUrl: "https://k/r", cancelUrl: "https://k/c", brandName: "Sana" });
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders");
    expect(init.headers["PayPal-Request-Id"]).toBe("kitevo-create-ord_1");
    const body = JSON.parse(init.body);
    expect(body.purchase_units[0]).toMatchObject({ custom_id: "ord_1", amount: { currency_code: "USD", value: "19.50" } });
    expect(body.payment_source.paypal.experience_context).toMatchObject({ return_url: "https://k/r", cancel_url: "https://k/c" });
    expect(approvalUrl(o)).toBe("https://www.sandbox.paypal.com/checkoutnow?token=PP1");
  });

  it("capture is idempotent: an already-captured order is fetched instead", async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, { access_token: "t" }))
      .mockResolvedValueOnce(json(422, { message: "Unprocessable", details: [{ issue: "ORDER_ALREADY_CAPTURED" }] }))
      .mockResolvedValueOnce(json(200, { access_token: "t" }))
      .mockResolvedValueOnce(json(200, { id: "PP1", status: "COMPLETED" }));
    expect((await capturePayPalOrder(creds, "PP1", "ord_1")).status).toBe("COMPLETED");
    expect(fetchMock.mock.calls[3][0]).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders/PP1");
  });

  it("other capture errors propagate", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { access_token: "t" })).mockResolvedValueOnce(json(422, { message: "Declined", details: [{ issue: "INSTRUMENT_DECLINED" }] }));
    await expect(capturePayPalOrder(creds, "PP1", "ord_1")).rejects.toThrow("Declined");
  });
});
