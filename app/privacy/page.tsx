import Link from "next/link";
import type { Metadata } from "next";
import { LogoMark } from "@/app/components/Logo";

export const metadata: Metadata = {
  title: "Privacy Policy — Kitevo",
  description: "How Kitevo collects, uses, and protects your data.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-border border-b px-5 py-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="font-display text-foreground inline-flex items-center gap-2 text-lg font-semibold tracking-tight hover:opacity-70 transition-opacity"
        >
          <LogoMark size={22} on="auto" />
          Kitevo
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
          Last updated: November 2026
        </p>

        <div className="prose-sm mt-12 space-y-10 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              1. Who we are
            </h2>
            <p>
              Kitevo ("we", "us", or "our") is a platform that allows
              content creators to build and share professional media kits. Our
              service is operated by Kitevo and our website is located at{" "}
              {(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/^https?:\/\//, "")}.
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
                <strong className="text-foreground">YouTube data:</strong>{" "}
                Channel name, subscriber count, total view count, video count,
                and recent videos with their view and like counts, fetched via
                the YouTube Data API when you authorize the connection. We do not
                receive or store your Google password.
              </li>
              <li>
                <strong className="text-foreground">Billing data:</strong>{" "}
                Subscription and payment information is handled directly by our
                payment processor (Dodo Payments, which acts as merchant of
                record, or Stripe). We store only your customer ID with that
                processor — we never see or store full card numbers.
              </li>
              <li>
                <strong className="text-foreground">Referral payout data:</strong>{" "}
                If you join the referral program and add payout details, we store
                your payout method and account (PayPal or Wise email, or bank
                details), legal name, country and optional tax ID — encrypted —
                along with which signups you referred and the commissions earned.
                We use this only to calculate and send your earnings and to keep
                the records tax law requires.
              </li>
              <li>
                <strong className="text-foreground">Download sign-ups:</strong>{" "}
                If you get a free download from a creator&apos;s kit, we store the
                name (optional) and email you enter and which product you got. We
                email you the download link, and the creator who offered it can
                see your name and email and may contact you. Kitevo doesn&apos;t
                send marketing to these addresses. The record is deleted if the
                creator deletes the product or their account. If you buy a paid
                product, you pay the creator directly through their own payment
                provider (Razorpay or Stripe); Kitevo never sees your card or bank details
                and only stores the payment&apos;s reference, amount and status.
              </li>
              <li>
                <strong className="text-foreground">Usage data:</strong> Kit view
                counts and referrer information (which URL sent a visitor to your
                kit), used to display analytics in your dashboard. We also record
                product milestones on our own servers (for example: account
                created, onboarding finished, kit created, first outside view of a
                kit, checkout started, plan upgraded or canceled) to understand how
                people use Kitevo. These records contain no message content or
                platform tokens and are deleted with your account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              3. How we use your data
            </h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>To operate and improve the Kitevo service.</li>
              <li>
                To display your public media kit page to visitors (brands and
                agencies) you share your link with.
              </li>
              <li>
                To process payments and manage your subscription via Stripe.
              </li>
              <li>
                To fetch your Instagram and YouTube statistics on your behalf and
                display them on your kit.
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
                We store your Instagram access token in our database, solely to
                refresh your kit statistics. Our database provider encrypts data
                at rest.
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

          {/*
            Required by the YouTube API Services Terms of Service: apps using the API must
            disclose it here, link Google's privacy policy and the YouTube ToS, and tell
            users how to revoke access. Google checks this page during OAuth verification.
          */}
          <section id="youtube-api">
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              5. YouTube API Services
            </h2>
            <p className="mb-3">
              Kitevo uses YouTube API Services to read your channel statistics
              when you connect your YouTube account. By using this feature you
              are also agreeing to be bound by the{" "}
              <a
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4"
              >
                YouTube Terms of Service
              </a>
              .
            </p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                We request read-only access. Kitevo cannot upload, edit, or
                delete anything on your channel.
              </li>
              <li>
                We read your subscriber count, total views, video count, and
                recent videos with their view and like counts, solely to display
                them on your own media kit.
              </li>
              <li>
                Kitevo&apos;s use and transfer of information received from Google
                APIs to any other app adheres to the{" "}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4"
                >
                  Google API Services User Data Policy
                </a>
                , including its Limited Use requirements.
              </li>
              <li>
                Google&apos;s handling of your data is governed by the{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4"
                >
                  Google Privacy Policy
                </a>
                .
              </li>
              <li>
                You can revoke Kitevo&apos;s access at any time from your
                dashboard, or through Google&apos;s{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4"
                >
                  security settings page
                </a>
                . On revocation we delete the stored tokens and the cached
                statistics derived from them.
              </li>
            </ul>
          </section>

          {/* Anchor target: the Meta data deletion callback returns a URL pointing here. */}
          <section id="data-deletion">
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              6. Deleting your data
            </h2>
            <p className="mb-3">There are three ways to remove your data:</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong className="text-foreground">
                  Disconnect a platform.
                </strong>{" "}
                Disconnecting Instagram or YouTube from your dashboard deletes
                the stored access tokens and the statistics we cached from them.
              </li>
              <li>
                <strong className="text-foreground">
                  Remove Kitevo from Instagram or Facebook.
                </strong>{" "}
                If you remove Kitevo in your Instagram or Facebook app settings,
                Meta notifies us automatically and we delete all data received
                from Meta, along with any statistics derived from it. Your Kitevo
                account and any kit content you wrote yourself are left intact,
                since you may have signed up by email.
              </li>
              <li>
                <strong className="text-foreground">Delete your account.</strong>{" "}
                Deleting your account from profile settings permanently removes
                your profile, kits, inquiries, messages, and all connected
                platform data. This cannot be undone.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              7. Data sharing
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
                <strong className="text-foreground">Supabase (PostgreSQL)</strong> —
                database storage.
              </li>
              <li>
                <strong className="text-foreground">Dodo Payments / Stripe</strong> —
                payment processing and billing.
              </li>
              <li>
                <strong className="text-foreground">Resend</strong> — sending
                account and notification emails.
              </li>
              <li>
                <strong className="text-foreground">Meta (Instagram)</strong> and{" "}
                <strong className="text-foreground">Google (YouTube)</strong> — only
                to fetch the API data you authorize.
              </li>
              <li>
                <strong className="text-foreground">Google Analytics</strong> and{" "}
                <strong className="text-foreground">Vercel Analytics</strong> —
                aggregate website traffic measurement (pages visited, referring
                site, device and approximate location).
              </li>
              <li>
                <strong className="text-foreground">Troopy</strong> — the support
                chat widget, which processes messages you send through it.
              </li>
            </ul>
            <p className="mt-3">
              Service providers process data only to provide their service to us,
              under their own terms and, where offered, data processing
              agreements. Data received from Google APIs is never shared for
              analytics or advertising (see section 5).
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              8. Your rights
            </h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>
                Request deletion of your account and associated data. Delete your account from the dashboard and your data will be removed within 30 days.
              </li>
              <li>
                Withdraw consent for Instagram data access at any time via your
                dashboard or via Meta's app settings.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              9. Data retention
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
              10. Security
            </h2>
            <p>
              We implement industry-standard security practices including encrypted
              storage of credentials, HTTPS for all data in transit, and strict
              access controls on our database. No system is 100% secure; if you
              believe your account has been compromised, contact us immediately via your dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              11. Cookies
            </h2>
            <p>
              We use a minimal set of first-party cookies: a session cookie for
              authentication, and a subscription-status cookie to avoid redundant
              API calls. We also use Google Analytics, which sets its own cookies
              (such as <code>_ga</code>) to measure aggregate website traffic.
              Vercel Analytics measures traffic without cookies. We do not use
              advertising cookies, and we do not use analytics data to target
              ads. You can opt out of Google Analytics with Google&apos;s{" "}
              <a
                href="https://tools.google.com/dlpage/gaoptout"
                className="text-foreground underline underline-offset-4"
                target="_blank"
                rel="noopener noreferrer"
              >
                opt-out browser add-on
              </a>{" "}
              or by blocking cookies in your browser.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              12. Changes to this policy
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
              13. Contact
            </h2>
            <p>
              Questions about this Privacy Policy? Contact us via the dashboard.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
