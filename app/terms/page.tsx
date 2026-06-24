import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Media Kit Pro",
  description: "Terms and conditions for using Media Kit Pro.",
};

export default function TermsOfService() {
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
          Terms of Service
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Last updated: June 2026
        </p>

        <div className="mt-12 space-y-10 text-sm leading-relaxed text-[#4a4a47]">
          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              1. Acceptance of terms
            </h2>
            <p>
              By creating an account or using Media Kit Pro ("Service"), you
              agree to these Terms of Service. If you do not agree, do not use
              the Service. These terms form a binding agreement between you and
              Media Kit Pro.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              2. Description of service
            </h2>
            <p>
              Media Kit Pro is a platform that enables content creators and
              influencers to create, customize, and share professional media
              kits with brands and agencies. The Service includes a dashboard for
              managing kit content, integration with the Instagram Graph API for
              live statistics, and shareable public kit URLs.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              3. Accounts
            </h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                You must provide accurate, current, and complete information when
                creating an account.
              </li>
              <li>
                You are responsible for maintaining the confidentiality of your
                login credentials and for all activity that occurs under your
                account.
              </li>
              <li>
                You must be at least 13 years old to use the Service. If you are
                under 18, you represent that you have your parent or guardian's
                permission.
              </li>
              <li>
                One person or legal entity may not maintain more than one free
                account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              4. Subscriptions and billing
            </h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                Paid plans (Starter and Pro) are billed monthly or annually in
                advance via Stripe. All prices are in USD.
              </li>
              <li>
                Subscriptions auto-renew until cancelled. You can cancel at any
                time from your dashboard; you retain access until the end of the
                current billing period.
              </li>
              <li>
                We do not issue refunds for partial billing periods except where
                required by law.
              </li>
              <li>
                We reserve the right to change pricing with 30 days' notice to
                existing subscribers.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              5. Your content
            </h2>
            <p className="mb-3">
              You retain ownership of all content you upload or enter into the
              Service ("Your Content"), including your bio, work samples, and
              rates. By using the Service, you grant Media Kit Pro a limited,
              non-exclusive, royalty-free license to store, display, and
              transmit Your Content solely to operate the Service.
            </p>
            <p>
              You represent that Your Content does not violate any third-party
              rights or applicable law. You must not upload content that is
              illegal, defamatory, infringing, or that you do not have the right
              to share.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              6. Instagram API usage
            </h2>
            <p>
              When you connect your Instagram account, you authorize us to access
              your Instagram business data via the Instagram Graph API. You must
              comply with Meta's Terms of Service and Platform Policy. We access
              only the data permitted by the permissions you grant. We may
              suspend or terminate your Instagram connection if we believe it
              violates Meta's policies.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              7. Prohibited uses
            </h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="ml-4 list-disc space-y-2">
              <li>Use the Service for any unlawful purpose.</li>
              <li>
                Submit false statistics, fabricated follower counts, or
                misleading information to deceive brands.
              </li>
              <li>
                Attempt to reverse engineer, scrape, or interfere with the
                Service.
              </li>
              <li>
                Use the Service to distribute spam, malware, or unsolicited
                communications.
              </li>
              <li>
                Impersonate another creator or misrepresent your identity.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              8. Intellectual property
            </h2>
            <p>
              The Media Kit Pro name, logo, design system, and underlying software
              are owned by Media Kit Pro and protected by intellectual property
              laws. You may not copy, modify, or distribute our proprietary
              materials without written permission.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              9. Disclaimers
            </h2>
            <p>
              The Service is provided "as is" without warranties of any kind,
              express or implied. We do not guarantee that the Service will be
              uninterrupted, error-free, or that it will result in any specific
              outcome (including brand deals or collaborations). Instagram API
              availability is subject to Meta's own uptime and policy decisions.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              10. Limitation of liability
            </h2>
            <p>
              To the maximum extent permitted by law, Media Kit Pro shall not be
              liable for any indirect, incidental, special, consequential, or
              punitive damages arising from your use of the Service. Our total
              liability to you for any claim shall not exceed the amount you paid
              us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              11. Termination
            </h2>
            <p>
              We may suspend or terminate your account if you violate these Terms.
              You may delete your account at any time from your dashboard or by
              contacting us. Upon termination, your public kit URL will become
              inactive and your data will be deleted within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              12. Changes to these terms
            </h2>
            <p>
              We may update these Terms from time to time. We will notify you by
              email or in-app notice of material changes. Continued use of the
              Service after changes take effect constitutes your acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              13. Governing law
            </h2>
            <p>
              These Terms are governed by the laws of India. Any disputes shall
              be subject to the exclusive jurisdiction of the courts of Mumbai,
              India.
            </p>
          </section>

          <section>
            <h2 className="text-foreground mb-3 text-lg font-medium tracking-tight">
              14. Contact
            </h2>
            <p>
              Questions about these Terms? Email us at{" "}
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
