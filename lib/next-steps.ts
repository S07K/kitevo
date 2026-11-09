/**
 * The dashboard's "What to do next": the few most useful actions for a creator right now,
 * from their real state (lib/workspace-summary). Pure and client-safe so the rules are
 * tested and the order is predictable: things someone is waiting on first, then money,
 * then setup that brings more of it.
 */

export type WorkspaceSummary = {
  deals: {
    /** Deals where a brand is waiting on me (their offer or counter to answer). */
    yourTurn: number;
    /** Agreed deals not yet marked delivered. */
    toDeliver: number;
    active: Array<{ id: string; title: string; counterpart: string; status: string; awaiting: "creator" | "brand" | null; dueCents: number; currency: string }>;
  };
  products: { published: number; drafts: number; claims30d: number; sales30d: number; revenue30d: Array<{ currency: string; cents: number }> };
  inquiries: { new: number };
  setup: {
    hasRates: boolean;
    bookingOn: boolean;
    schedulerConnected: boolean;
    paymentConnected: boolean;
    statsConnected: boolean;
    hasManualStats: boolean;
    copilotReady: boolean;
  };
};

export type NextStep = {
  id: string;
  title: string;
  why: string;
  href: string;
  cta: string;
  /** Lower first. */
  rank: number;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function nextSteps(s: WorkspaceSummary, opts: { paidPlan: boolean; kitId: string | null }): NextStep[] {
  const steps: NextStep[] = [];
  const hasKit = !!opts.kitId;
  const editor = (section: string) => `/kit/edit?id=${encodeURIComponent(opts.kitId ?? "")}&section=${section}`;
  const add = (step: NextStep) => steps.push(step);

  if (s.deals.yourTurn > 0) {
    const one = s.deals.active.find((d) => d.awaiting === "creator");
    add({
      id: "deal-reply",
      rank: 0,
      title: s.deals.yourTurn === 1 && one ? `${one.counterpart} is waiting on you` : `${plural(s.deals.yourTurn, "deal")} waiting on you`,
      why: "Accept, counter or decline the terms so the brand knows where they stand.",
      href: s.deals.yourTurn === 1 && one ? `/deals/${one.id}` : "/deals",
      cta: "Open deal",
    });
  }
  if (s.inquiries.new > 0) {
    add({
      id: "inquiries",
      rank: 1,
      title: `Reply to ${plural(s.inquiries.new, "new inquiry", "new inquiries")}`,
      why: s.setup.copilotReady ? "Brands that hear back quickly book more often. Copilot can draft the reply." : "Brands that hear back quickly book more often.",
      href: "/pipeline",
      cta: "Open Pipeline",
    });
  }
  if (s.deals.toDeliver > 0) {
    add({
      id: "deliver",
      rank: 2,
      title: `Deliver ${plural(s.deals.toDeliver, "agreed deal")}`,
      why: "Mark it delivered when the content is live; any balance then becomes due to you.",
      href: "/deals",
      cta: "See deals",
    });
  }
  if (hasKit && !s.setup.statsConnected && !s.setup.hasManualStats) {
    add({
      id: "stats",
      rank: 3,
      title: "Add your numbers",
      why: "Brands look at reach first. Connect Instagram or YouTube, or enter your numbers yourself.",
      href: "/connectors",
      cta: "Connect accounts",
    });
  }
  if (hasKit && !s.setup.hasRates) {
    add({
      id: "rates",
      rank: 4,
      title: "Put your rates on your kit",
      why: "Brands decide faster when prices are on the kit. Copilot can suggest them from your numbers.",
      href: editor("rates"),
      cta: "Add rates",
    });
  }
  if (hasKit && !s.setup.bookingOn) {
    add({
      id: "booking",
      rank: 5,
      title: "Let brands book a call",
      why: s.setup.schedulerConnected ? "Your scheduler is connected. Turn on Book a call in your kit's Contact card." : "Connect Calendly, Cal.com or Google Calendar and a Book a call button appears on your kit.",
      href: s.setup.schedulerConnected ? editor("contact") : "/connectors",
      cta: s.setup.schedulerConnected ? "Turn it on" : "Connect a scheduler",
    });
  }
  if (s.products.published === 0) {
    add({
      id: "product",
      rank: 6,
      title: s.products.drafts > 0 ? "Publish your product" : "Offer a free download",
      why: s.products.drafts > 0 ? "It's saved as a draft. Publish it and it shows in your kit's Shop." : "A guide or preset in exchange for an email grows a list you own.",
      href: "/products",
      cta: s.products.drafts > 0 ? "Open Products" : "Create one",
    });
  }
  if (opts.paidPlan && s.products.published > 0 && !s.setup.paymentConnected) {
    add({
      id: "payments",
      rank: 7,
      title: "Connect a payment account",
      why: "Sell paid products and take deal payments straight into your own Razorpay, Stripe or PayPal.",
      href: "/connectors",
      cta: "Connect payments",
    });
  }
  return steps.sort((a, b) => a.rank - b.rank).slice(0, 3);
}
