import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Media Kit Pro",
  description: "How Media Kit Pro collects, uses, and protects your data.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-border border-b px-5 py-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="font-display text-foreground text-lg font-semibold tracking-tight hover:opacity-70 transition-opacity"
        >
          Media Kit Pro
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <p className="text-muted-foreground mb-4 text-xs font-semibold tracking-[0.18em] uppercase">
          Legal
        </p>
        <h1 className="text-foreground text-4xl font-medium tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Last updated: June 2026
        </p>

        <div className="prose-sm mt-12 space-y-10 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              1. Who we are
            </h2>
            <p>
              Media Kit Pro ("we", "us", or "our") is a platform that allows
              content creators to build and share professional media kits. Our
              service is operated by Media Kit Pro and our website is located at{" "}
              mediakitpro.co.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              2. What data we collect
            </h2>
            <p className="mb-3">We collect the following categories of data:</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong className="text-foreground">Account data:</strong> Your
                name, email address, and password (stored as a bcrypt hash) when
                you create an account.
              </li>
              <li>
                <strong className="text-foreground">Profile data:</strong>{" "}
                Username, bio, avatar image, and social profile links you enter
                in your profile.
              </li>
              <li>
                <strong className="text-foreground">Kit content:</strong> Work
                samples, rates, brand partnerships, and any other content you
                add to your media kit.
              </li>
              <li>
                <strong className="text-foreground">Instagram data:</strong>{" "}
                Follower count, engagement rate, audience demographics, and
                recent post data fetched via the Instagram Graph API when you
                authorize the connection. We do not receive or store your
                Instagram password.
              </li>
              <li>
                <strong className="text-foreground">Billing data:</strong>{" "}
                Subscription and payment information is handled directly by
                Stripe. We store only your Stripe Customer ID — we never store
                full card numbers.
              </li>
              <li>
                <strong className="text-foreground">Usage data:</strong> Kit view
                counts and referrer information (which URL sent a visitor to your
                kit), used to display analytics in your dashboard.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              3. How we use your data
            </h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>To operate and improve the Media Kit Pro service.</li>
              <li>
                To display your public media kit page to visitors (brands and
                agencies) you share your link with.
              </li>
              <li>
                To process payments and manage your subscription via Stripe.
              </li>
              <li>
                To fetch your Instagram stats on your behalf and display them on
                your kit.
              </li>
              <li>
                To send transactional emails (account confirmation, billing
                receipts). We do not send marketing emails without explicit
                consent.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              4. Instagram Graph API data
            </h2>
            <p className="mb-3">
              When you connect your Instagram account, we use Meta's official
              Instagram Graph API under their Platform Policy. Specifically:
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                We request only the permissions needed to read your public
                business/creator account metrics.
              </li>
              <li>
                We store your Instagram access token encrypted in our database
                solely to refresh your kit statistics.
              </li>
              <li>
                We do not use your Instagram data for advertising, sell it to
                third parties, or share it beyond displaying it on your own kit
                page.
              </li>
              <li>
                You can disconnect Instagram at any time from your dashboard.
                Upon disconnection, we delete your stored access token.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              5. Data sharing
            </h2>
            <p>
              We do not sell your personal data. We share data only with service
              providers who help us operate the platform, including:
            </p>
            <ul className="ml-4 mt-3 list-disc space-y-2">
              <li>
                <strong className="text-foreground">Vercel</strong> — hosting and
                infrastructure.
              </li>
              <li>
                <strong className="text-foreground">Neon / PostgreSQL</strong> —
                database storage.
              </li>
              <li>
                <strong className="text-foreground">Stripe</strong> — payment
                processing.
              </li>
              <li>
                <strong className="text-foreground">Meta (Instagram)</strong> —
                only to fetch the API data you authorize.
              </li>
            </ul>
            <p className="mt-3">
              All service providers are bound by data processing agreements and
              are prohibited from using your data for their own purposes.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              6. Your rights
            </h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>
                Request deletion of your account and associated data. Email us
                at hello@mediakitpro.co and we will delete your account within
                30 days.
              </li>
              <li>
                Withdraw consent for Instagram data access at any time via your
                dashboard or via Meta's app settings.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              7. Data retention
            </h2>
            <p>
              We retain your data for as long as your account is active. If you
              delete your account, we will remove your personal data within 30
              days, except where we are required to retain it for legal or
              financial compliance reasons.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              8. Security
            </h2>
            <p>
              We implement industry-standard security practices including encrypted
              storage of credentials, HTTPS for all data in transit, and strict
              access controls on our database. No system is 100% secure; if you
              believe your account has been compromised, contact us immediately at
              hello@mediakitpro.co.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              9. Cookies
            </h2>
            <p>
              We use a minimal set of cookies: a session cookie for
              authentication, and a subscription-status cookie to avoid redundant
              API calls. We do not use advertising or tracking cookies. We do not
              use third-party analytics cookies.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              10. Changes to this policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify
              you of material changes by email or by displaying a notice in your
              dashboard. Continued use of the service after changes take effect
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              11. Contact
            </h2>
            <p>
              Questions about this Privacy Policy? Email us at{" "}
              <a
                href="mailto:hello@mediakitpro.co"
                className="text-foreground underline underline-offset-4 hover:opacity-70"
              >
                hello@mediakitpro.co
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
