import { describe, it, expect } from "vitest";
import { nextSteps, type WorkspaceSummary } from "./next-steps";

const base = (): WorkspaceSummary => ({
  deals: { yourTurn: 0, toDeliver: 0, active: [] },
  products: { published: 1, drafts: 0, claims30d: 0, sales30d: 0, revenue30d: [] },
  inquiries: { new: 0 },
  setup: { hasRates: true, bookingOn: true, schedulerConnected: true, paymentConnected: true, statsConnected: true, hasManualStats: false, copilotReady: true },
});
const ids = (s: WorkspaceSummary, paidPlan = true, kitId: string | null = "k1") => nextSteps(s, { paidPlan, kitId }).map((x) => x.id);

describe("nextSteps", () => {
  it("says nothing when everything is done", () => {
    expect(ids(base())).toEqual([]);
  });

  it("puts brands waiting on you first, naming the brand when there's one", () => {
    const s = base();
    s.deals.yourTurn = 1;
    s.deals.active = [{ id: "d1", title: "Diwali Reel", counterpart: "Oats Co", status: "proposed", awaiting: "creator", dueCents: 0, currency: "INR" }];
    s.inquiries.new = 2;
    s.setup.hasRates = false;
    const steps = nextSteps(s, { paidPlan: true, kitId: "k1" });
    expect(steps.map((x) => x.id)).toEqual(["deal-reply", "inquiries", "rates"]);
    expect(steps[0]).toMatchObject({ title: "Oats Co is waiting on you", href: "/deals/d1" });
    expect(steps[1].title).toBe("Reply to 2 new inquiries");
    expect(steps[1].why).toMatch(/Copilot/);
  });

  it("shows at most three", () => {
    const s = base();
    s.deals.yourTurn = 2;
    s.inquiries.new = 1;
    s.deals.toDeliver = 1;
    s.setup.hasRates = false;
    s.setup.bookingOn = false;
    expect(ids(s)).toEqual(["deal-reply", "inquiries", "deliver"]);
  });

  it("links editor steps to the main kit's card", () => {
    const s = base();
    s.setup.hasRates = false;
    s.setup.bookingOn = false;
    const steps = nextSteps(s, { paidPlan: true, kitId: "kit 1" });
    expect(steps.find((x) => x.id === "rates")?.href).toBe("/kit/edit?id=kit%201&section=rates");
    // Scheduler connected → turn it on in the Contact card; not connected → Connectors.
    expect(steps.find((x) => x.id === "booking")?.href).toBe("/kit/edit?id=kit%201&section=contact");
    s.setup.schedulerConnected = false;
    expect(nextSteps(s, { paidPlan: true, kitId: "k" }).find((x) => x.id === "booking")?.href).toBe("/connectors");
  });

  it("only asks for numbers when there are neither live nor self-reported ones", () => {
    const s = base();
    s.setup.statsConnected = false;
    expect(ids(s)).toContain("stats");
    s.setup.hasManualStats = true;
    expect(ids(s)).not.toContain("stats");
  });

  it("skips kit steps without a kit", () => {
    const s = base();
    s.setup.hasRates = false;
    s.setup.bookingOn = false;
    s.setup.statsConnected = false;
    expect(ids(s, true, null)).toEqual([]);
  });

  it("products: drafts get 'publish', none get 'offer'; payments only for paid plans with products", () => {
    const s = base();
    s.products = { published: 0, drafts: 1, claims30d: 0, sales30d: 0, revenue30d: [] };
    expect(nextSteps(s, { paidPlan: true, kitId: "k" })[0].title).toBe("Publish your product");
    s.products.drafts = 0;
    expect(nextSteps(s, { paidPlan: true, kitId: "k" })[0].title).toBe("Offer a free download");

    const p = base();
    p.setup.paymentConnected = false;
    expect(ids(p, true)).toEqual(["payments"]);
    expect(ids(p, false)).toEqual([]);
  });
});
