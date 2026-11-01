"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, Compass, CreditCard, Gift, House, Megaphone, MessageCircle, Settings } from "lucide-react";
import { REFERRAL_RATE_PCT } from "@/lib/referral-terms";

/**
 * The one navigation for the signed-in app. Every workspace page renders this instead of
 * top-bar links: a grouped left sidebar on desktop, a bottom tab bar on phones.
 *
 * Creator: Home · Social (Campaigns, Messages) · Grow (Invite & earn) · footer (View my
 * kit, Plan & billing, Settings). Brand: Discover · Campaigns · Inbox · Grow · Settings.
 *
 * Pages that know the account type pass `variant`; shared pages (e.g. /referrals) omit
 * it and the sidebar asks /api/me/profile.
 */

type Variant = "creator" | "brand";
type Item = { href: string; label: string; icon: ReactNode; badge?: number; external?: boolean; match?: (p: string) => boolean };
type Section = { title?: string; items: Item[] };

const ICON = { size: 17, strokeWidth: 1.8, "aria-hidden": true } as const;

export function WorkspaceSidebar({ variant: variantProp, inboxBadge }: { variant?: Variant; inboxBadge?: number }) {
  const pathname = usePathname() ?? "";
  const [variant, setVariant] = useState<Variant | null>(variantProp ?? null);
  const [unread, setUnread] = useState(0);
  const [kitSlug, setKitSlug] = useState<string | null>(null);

  useEffect(() => {
    if (variantProp) return;
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => setVariant(p?.accountType === "brand" ? "brand" : "creator"))
      .catch(() => setVariant("creator"));
  }, [variantProp]);

  useEffect(() => {
    if (inboxBadge !== undefined) return;
    fetch("/api/social/conversations", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => Array.isArray(d) && setUnread(d.filter((c: { unread?: boolean }) => c.unread).length))
      .catch(() => {});
  }, [inboxBadge]);

  useEffect(() => {
    if (variant !== "creator") return;
    fetch("/api/kits", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((k) => Array.isArray(k) && k[0]?.slug && setKitSlug(k[0].slug))
      .catch(() => {});
  }, [variant]);

  const badge = inboxBadge ?? unread;
  const earn: Item = { href: "/referrals", label: "Invite & earn", icon: <Gift {...ICON} /> };

  const creator: { sections: Section[]; footer: Item[]; mobile: Item[] } = {
    sections: [
      { items: [{ href: "/dashboard", label: "Home", icon: <House {...ICON} /> }] },
      {
        title: "Social",
        items: [
          {
            href: "/social/campaigns",
            label: "Campaigns",
            icon: <Megaphone {...ICON} />,
            match: (p) => p.startsWith("/social/campaigns") || p.startsWith("/campaigns/"),
          },
          { href: "/social/inbox", label: "Messages", icon: <MessageCircle {...ICON} />, badge },
        ],
      },
      { title: "Grow", items: [earn] },
    ],
    footer: [
      ...(kitSlug ? [{ href: `/kit/${kitSlug}`, label: "View my kit", icon: <ArrowUpRight {...ICON} />, external: true }] : []),
      { href: "/pricing", label: "Plan & billing", icon: <CreditCard {...ICON} /> },
      { href: "/profile", label: "Settings", icon: <Settings {...ICON} /> },
    ],
    mobile: [],
  };
  creator.mobile = [
    { href: "/dashboard", label: "Home", icon: <House {...ICON} /> },
    creator.sections[1].items[0],
    { ...creator.sections[1].items[1], label: "Messages" },
    { ...earn, label: "Earn" },
    { href: "/profile", label: "Settings", icon: <Settings {...ICON} /> },
  ];

  const brandInbox: Item = { href: "/brand/inbox", label: "Inbox", icon: <MessageCircle {...ICON} />, badge };
  const brand: { sections: Section[]; footer: Item[]; mobile: Item[] } = {
    sections: [
      {
        items: [
          { href: "/brand", label: "Discover", icon: <Compass {...ICON} /> },
          {
            href: "/brand/campaigns",
            label: "Campaigns",
            icon: <Megaphone {...ICON} />,
            match: (p) => p.startsWith("/brand/campaigns") || p.startsWith("/campaigns/"),
          },
          brandInbox,
        ],
      },
      { title: "Grow", items: [earn] },
    ],
    footer: [{ href: "/brand/settings", label: "Settings", icon: <Settings {...ICON} /> }],
    mobile: [],
  };
  brand.mobile = [...brand.sections[0].items, { ...earn, label: "Earn" }, brand.footer[0]];

  const nav = variant === "brand" ? brand : creator;
  const isActive = (i: Item) => (i.match ? i.match(pathname) : pathname === i.href);

  return (
    <>
      {/* Desktop */}
      <aside className="fixed bottom-0 left-0 top-[57px] z-40 hidden w-56 shrink-0 flex-col border-r border-border bg-background md:flex">
        {variant ? (
          <>
            <nav className="flex flex-1 flex-col gap-5 overflow-y-auto p-3 pt-5" aria-label="Workspace">
              {nav.sections.map((s, i) => (
                <div key={s.title ?? i}>
                  {s.title && <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">{s.title}</p>}
                  <div className="flex flex-col gap-0.5">
                    {s.items.map((it) => (
                      <NavItem key={it.href} item={it} active={isActive(it)} />
                    ))}
                  </div>
                </div>
              ))}
              {/* Referral nudge — the program is the main growth loop */}
              {pathname !== "/referrals" && (
                <Link
                  href="/referrals"
                  className="mx-1 mt-1 rounded-xl border border-border bg-muted/40 p-3 text-xs transition-colors hover:border-foreground/30"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Gift size={13} aria-hidden /> Earn {REFERRAL_RATE_PCT}%
                  </span>
                  <span className="mt-1 block leading-relaxed text-muted-foreground">for every creator you invite, for a year.</span>
                </Link>
              )}
            </nav>
            <div className="flex flex-col gap-0.5 border-t border-border p-3">
              {nav.footer.map((it) => (
                <NavItem key={it.href} item={it} active={isActive(it)} />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-2 p-4 pt-6" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}
      </aside>

      {/* Mobile bottom tabs */}
      {variant && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-background/95 backdrop-blur-md md:hidden" aria-label="Workspace">
          {nav.mobile.map((it) => {
            const active = isActive(it);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {it.badge ? (
                  <span className="absolute right-1/4 top-1.5 flex h-4 min-w-4 translate-x-2 items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white">
                    {it.badge > 9 ? "9+" : it.badge}
                  </span>
                ) : null}
                {it.icon}
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </>
  );
}

function NavItem({ item, active }: { item: Item; active: boolean }) {
  const cls = `relative flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
    active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
  }`;
  const inner = (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 opacity-80">{item.icon}</span>
        <span className="truncate">{item.label}</span>
      </span>
      {item.badge ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
          {item.badge > 9 ? "9+" : item.badge}
        </span>
      ) : null}
    </>
  );
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={item.href} className={cls} aria-current={active ? "page" : undefined}>
      {inner}
    </Link>
  );
}
