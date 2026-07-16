import Link from "next/link";
import type { ReactNode } from "react";

const VIBE_STRIP = [
  { name: "Editorial", bg: "#111110", label: "#fff" },
  { name: "Studio", bg: "#e8e6e1", label: "#2d2d2b" },
  { name: "Noir", bg: "#1a1a18", label: "#c9a84c" },
  { name: "Bloom", bg: "#f5ede4", label: "#c97b4b" },
  { name: "Electric", bg: "#0d0d1a", label: "#6366f1" },
];

const NAV = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Vibes", href: "#vibes" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const ACCOUNT = [
  { label: "Sign up", href: "/signup" },
  { label: "Log in", href: "/login" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Instagram help", href: "/help/instagram" },
];

const LEGAL = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export function MarketingFooter(): ReactNode {
  return (
    <footer>
      {/* Vibe color strip */}
      <div className="flex h-2 w-full overflow-hidden">
        {VIBE_STRIP.map((v) => (
          <div key={v.name} className="flex-1" style={{ backgroundColor: v.bg }} title={v.name} />
        ))}
      </div>

      {/* Statement bar */}
      <div className="bg-foreground text-background px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1440px] flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
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
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-10">
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
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

            {/* Kit Vibes */}
            <div>
              <h3 className="text-foreground mb-4 text-xs font-semibold tracking-[0.15em] uppercase">
                Kit Vibes
              </h3>
              <ul className="space-y-2.5">
                {VIBE_STRIP.map((v) => (
                  <li key={v.name}>
                    <a
                      href="#vibes"
                      className="focus-ring text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
                    >
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full border border-black/10"
                        style={{ backgroundColor: v.bg }}
                      />
                      {v.name}
                    </a>
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

          <div className="border-border mt-10 flex flex-col items-start justify-between gap-3 border-t pt-6 text-xs sm:flex-row sm:items-center">
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
