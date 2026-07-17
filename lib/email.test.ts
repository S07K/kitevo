import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted: vi.mock is lifted above module scope, so a plain `const send` would still be
// in its TDZ when the factory runs. A class, not vi.fn(), because lib/email.ts calls
// `new Resend(...)` at import time.
const { send } = vi.hoisted(() => ({
  send: vi.fn().mockResolvedValue({ data: { id: "e_1" }, error: null }),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

import {
  sendVerificationEmail,
  sendInquiryNotification,
  sendViewMilestoneEmail,
  sendDeleteAccountCodeEmail,
  sendPasswordResetEmail,
} from "./email";

/** Every send path, so a new template can't skip these checks by existing. */
const SENDERS: { name: string; run: () => Promise<unknown> }[] = [
  { name: "verification", run: () => sendVerificationEmail("a@b.com", "tok") },
  {
    name: "inquiry",
    run: () =>
      sendInquiryNotification({
        ownerEmail: "owner@b.com",
        ownerName: "Owner",
        kitName: "test",
        kitSlug: "test",
        from: { name: "Brand", email: "brand@x.com", company: "X Co", message: "Hi There!" },
      }),
  },
  {
    name: "view milestone",
    run: () =>
      sendViewMilestoneEmail({ ownerEmail: "o@b.com", ownerName: "O", kitName: "test", milestone: 1000 }),
  },
  { name: "delete code", run: () => sendDeleteAccountCodeEmail("a@b.com", "123456") },
  { name: "password reset", run: () => sendPasswordResetEmail("a@b.com", "tok") },
];

async function capture(run: () => Promise<unknown>) {
  send.mockClear();
  await run();
  expect(send).toHaveBeenCalledOnce();
  return send.mock.calls[0][0] as { subject: string; html: string; from: string };
}

describe("email templates", () => {
  beforeEach(() => send.mockClear());

  // House style: no em/en dashes in anything a user reads. Subjects are the easy place to
  // reintroduce one, and nobody notices until it ships.
  describe.each(SENDERS)("$name", ({ run }) => {
    it("uses no em or en dash in the subject", async () => {
      const { subject } = await capture(run);
      expect(subject).not.toMatch(/[—–]/);
    });

    it("uses no em or en dash in the body", async () => {
      const { html } = await capture(run);
      // Strip the HTML comments in the shell; only rendered copy is in scope.
      expect(html.replace(/<!--[\s\S]*?-->/g, "")).not.toMatch(/[—–]/);
    });

    it("builds links from APP_URL rather than a hardcoded host", async () => {
      const { html } = await capture(run);
      // `<` must be excluded: the delete-account email renders APP_URL as bare link text,
      // so the host is immediately followed by `</a>`.
      const hosts = [...html.matchAll(/https?:\/\/([^/"\s<]+)/g)].map((m) => m[1]);
      // vitest.setup.ts pins NEXT_PUBLIC_APP_URL to localhost:3000. Anything else is
      // hardcoded. w3.org is the DOCTYPE/namespace, not a link.
      for (const h of hosts) expect(h).toBe("localhost:3000");
    });
  });

  it("points the logo at APP_URL and hides it from screen readers", async () => {
    const { html } = await capture(SENDERS[0].run);
    expect(html).toContain('src="http://localhost:3000/logo-email.png"');
    // The wordmark beside it is the accessible name; alt text would say it twice.
    expect(html).toMatch(/<img[^>]+alt=""/);
  });

  it("sends from RESEND_FROM_EMAIL, not Resend's sandbox sender", async () => {
    const { from } = await capture(SENDERS[0].run);
    expect(from).not.toMatch(/@resend\.dev$/);
  });
});
