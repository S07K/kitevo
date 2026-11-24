import Link from "next/link";
import type { ReactNode } from "react";
import { PluggybackCard } from "@/components/pluggyback-card";


const NAV = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Ways to earn", href: "#ways-to-earn" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const ACCOUNT = [
  { label: "Sign up", href: "/signup" },
  { label: "Log in", href: "/login" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Instagram help", href: "/help/instagram" },
  { label: "Referral program", href: "/referral-program" },
  { label: "Rate calculator", href: "/tools/rate-calculator" },
  { label: "Engagement calculator", href: "/tools/engagement-rate-calculator" },
  { label: "Compare Kitevo", href: "/compare" },
  { label: "Integrations", href: "/integrations" },
];

const LEGAL = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

const SOCIAL_HANDLE = "getkitevo";

const SOCIALS = [
  {
    name: "Instagram",
    href: `https://instagram.com/${SOCIAL_HANDLE}`,
    path: "M12 2.2c3.2 0 3.6 0 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.14 15.6 2.13 15.2 2.13 12s.01-3.58.07-4.85C2.35 3.92 3.87 2.4 7.12 2.27 8.4 2.2 8.8 2.2 12 2.2Zm0 3.64a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32Zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z",
  },
  {
    name: "X",
    href: `https://x.com/${SOCIAL_HANDLE}`,
    path: "M18.9 2.5h3.3l-7.2 8.2 8.5 11.3h-6.7l-5.2-6.8-6 6.8H1.3l7.7-8.8L.9 2.5h6.8l4.7 6.2 5.5-6.2Zm-1.2 17.5h1.8L6.4 4.4H4.5l13.2 15.6Z",
  },
  {
    name: "LinkedIn",
    href: `https://linkedin.com/company/${SOCIAL_HANDLE}`,
    path: "M6.94 5a2 2 0 1 1-4-.02 2 2 0 0 1 4 .02ZM7 8.48H3V21h4V8.48Zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91l.04-1.68Z",
  },
];

export function MarketingFooter(): ReactNode {
  return (
    <footer>

      {/* Statement bar */}
      <div className="bg-foreground text-background py-12">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 sm:flex-row sm:items-end sm:justify-between sm:px-10">
          <div>
            <p className="text-background/50 text-xs font-semibold tracking-[0.2em] uppercase mb-3">
              Kitevo
            </p>
            <h2 className="text-[clamp(28px,4vw,48px)] font-medium tracking-tight leading-tight max-w-lg text-balance">
              One link. Every stat.<br />Every deal.
            </h2>
          </div>
          <Link
            href="/signup"
            className="focus-ring bg-background text-foreground inline-flex h-12 shrink-0 items-center rounded-full px-7 text-sm font-medium transition-opacity hover:opacity-80"
          >
            Start building free
          </Link>
        </div>
      </div>

      {/* Links grid */}
      <div className="border-border border-t">
        <div className="mx-auto max-w-[1200px] px-6 py-12 sm:px-10">
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
            {/* Product */}
            <div>
              <h3 className="text-foreground mb-4 text-xs font-semibold tracking-[0.15em] uppercase">
                Product
              </h3>
              <ul className="space-y-2.5">
                {NAV.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="focus-ring text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account */}
            <div>
              <h3 className="text-foreground mb-4 text-xs font-semibold tracking-[0.15em] uppercase">
                Account
              </h3>
              <ul className="space-y-2.5">
                {ACCOUNT.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="focus-ring text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-foreground mb-4 text-xs font-semibold tracking-[0.15em] uppercase">
                Legal
              </h3>
              <ul className="space-y-2.5">
                {LEGAL.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="focus-ring text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Socials */}
          <div className="border-border mt-10 flex items-center gap-2 border-t pt-6">
            {SOCIALS.map((s) => (
              <a
                key={s.name}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Kitevo on ${s.name}`}
                title={`@${SOCIAL_HANDLE} on ${s.name}`}
                className="focus-ring border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>

          {/* Product Hunt featured badge */}
          <div className="mt-8">
            <a
              href="https://www.producthunt.com/products/kitevo?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-kitevo"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kitevo on Product Hunt"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1239307&theme=light&t=1788346221541"
                alt="Kitevo - Live media kits that turn creator stats into brand deals | Product Hunt"
                width={250}
                height={54}
              />
            </a>
          </div>

          {/* Pluggyback network card (collapses to nothing when there is nothing to show) */}
          <div className="mt-6">
            <PluggybackCard />
          </div>

          <div className="border-border mt-6 flex flex-col items-start justify-between gap-3 border-t pt-6 text-xs sm:flex-row sm:items-center">
            <p className="text-muted-foreground">
              © {new Date().getFullYear()} Kitevo. All rights reserved.
            </p>
            <p className="text-muted-foreground">
              For creators who are serious about brand deals.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
