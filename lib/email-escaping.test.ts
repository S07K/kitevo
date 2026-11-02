import { describe, it, expect, vi, beforeEach } from "vitest";

const sent: Array<{ html: string; subject: string; to: string }> = [];
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: async (args: { html: string; subject: string; to: string }) => (sent.push(args), { data: { id: "x" }, error: null }) };
  },
}));

const { sendApplicationReceivedEmail, sendApplicationDecisionEmail, sendInquiryNotification } = await import("./email");

const EVIL = `<script>alert(1)</script><img src=x onerror=alert(2)>`;

describe("email templates escape user-supplied text", () => {
  beforeEach(() => (sent.length = 0));

  it("application received (creator name, username, pitch, campaign title)", async () => {
    await sendApplicationReceivedEmail({ brandEmail: "b@x.com", campaignTitle: EVIL, creator: { name: EVIL, username: EVIL }, pitch: EVIL });
    const { html } = sent[0];
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
  });

  it("application decision (brand name, campaign title) for both outcomes", async () => {
    await sendApplicationDecisionEmail({ creatorEmail: "c@x.com", campaignId: "c1", campaignTitle: EVIL, brandName: EVIL, decision: "accepted" });
    await sendApplicationDecisionEmail({ creatorEmail: "c@x.com", campaignId: "c1", campaignTitle: EVIL, brandName: EVIL, decision: "rejected" });
    for (const { html } of sent) {
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    }
    expect(sent[0].html).toContain("/campaigns/c1");
  });

  it("kit inquiry (visitor name, company, email, message)", async () => {
    await sendInquiryNotification({
      ownerEmail: "o@x.com",
      ownerName: "Owner",
      kitName: "Kit",
      kitSlug: "kit",
      from: { name: EVIL, email: `a@x.com"><script>`, company: EVIL, message: `${EVIL}\nsecond line` },
    });
    const { html } = sent[0];
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("second line");
  });
});
