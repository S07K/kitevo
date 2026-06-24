import Link from "next/link";
import type { ReactNode } from "react";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Vibes", href: "#vibes" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign up", href: "/signup" },
      { label: "Log in", href: "/login" },
      { label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export function MarketingFooter(): ReactNode {
  return (
    <footer className="border-border border-t">
      <div className="mx-auto max-w-[1440px] px-5 pt-16 sm:px-8 sm:pt-20 lg:px-10">
        <div className="flex flex-col gap-14 lg:flex-row lg:justify-between">
          <div className="max-w-xs">
            <Link href="/" className="focus-ring inline-block rounded-sm">
              <span className="font-display text-foreground text-xl font-semibold tracking-tight">
                Media Kit Pro
              </span>
            </Link>
            <p className="text-muted-foreground mt-5 text-sm leading-relaxed">
              The professional media kit platform for creators who want to close
              brand deals — not just send emails.
            </p>
            <Link
              href="/signup"
              className="focus-ring bg-foreground text-background mt-7 inline-flex h-11 items-center rounded-full px-6 text-sm font-medium transition-opacity hover:opacity-80"
            >
              Start for free
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:gap-x-16">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="text-foreground text-sm font-medium tracking-tight">
                  {col.title}
                </h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      {link.href.startsWith("#") ? (
                        <a
                          href={link.href}
                          className="focus-ring text-muted-foreground hover:text-foreground text-sm transition-colors"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="focus-ring text-muted-foreground hover:text-foreground text-sm transition-colors"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col-reverse items-start justify-between gap-4 border-t border-border pt-6 pb-8 sm:flex-row sm:items-center">
          <p className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} Media Kit Pro. All rights reserved.
          </p>
          <p className="text-muted-foreground text-xs">
            Built for creators who are serious about brand deals.
          </p>
        </div>

        <div aria-hidden className="pointer-events-none overflow-hidden select-none">
          <p className="text-muted-foreground/10 translate-y-[30%] text-center text-[clamp(60px,16vw,220px)] leading-[0.85] font-semibold tracking-tighter">
            Media Kit Pro
          </p>
        </div>
      </div>
    </footer>
  );
}
