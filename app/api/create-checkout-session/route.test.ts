import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// The route decides "already subscribed" via prisma (stripeCustomerId) + stripe.subscriptions.list.
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/fake" }),
      },
    },
    subscriptions: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  },
}));

vi.mock("@/config/subscriptions", () => ({
  getPriceIdForTier: vi.fn((tier: string) => (tier === "starter" || tier === "pro" ? "price_fake" : null)),
}));

const { getServerSession } = await import("next-auth");
const { prisma } = await import("@/lib/prisma");
const { stripe } = await import("@/lib/stripe");

describe("POST /api/create-checkout-session", () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({ data: [] } as never);
  });

  it("returns 409 when logged-in user already has an active subscription", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "subscribed@example.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ stripeCustomerId: "cus_1" } as never);
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({ data: [{ id: "sub_1" }] } as never);

    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ tierId: "starter" }),
      })
    );
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe(
      "You already have an active subscription. Manage it from your dashboard."
    );
  });

  it("allows checkout when logged in but not subscribed", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "user@example.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ stripeCustomerId: null } as never);

    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ tierId: "starter" }),
      })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/fake");
  });

  it("returns 401 when not logged in", async () => {
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ tierId: "pro" }),
      })
    );
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Sign in to subscribe");
  });
});
