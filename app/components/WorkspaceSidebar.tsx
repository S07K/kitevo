"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { ArrowUpRight, ChevronsUpDown, Compass, CreditCard, Gift, House, LogOut, Megaphone, MessageCircle, Moon, Settings, ShieldCheck, Sun } from "lucide-react";
import { AvatarImg } from "./AvatarImg";
import { REFERRAL_RATE_PCT } from "@/lib/referral-terms";
import { Skeleton } from "@/app/components/Skeleton";

/**
 * The one navigation for the signed-in app. Every workspace page renders this instead of
 * top-bar links: a grouped left sidebar on desktop, a bottom tab bar on phones.
 *
 * Every tab is one top-level route: /dashboard (creator home), /discover (brand home),
 * /campaigns, /messages, /referrals, /settings, /pricing. /campaigns, /messages and
 * /settings render the creator or brand view server-side.
 *
 * Pages that know the account type pass `variant`; shared pages (e.g. /referrals) omit
 * it and the sidebar asks /api/me/profile.
 */

type Variant = "creator" | "brand";
type Item = { href: string; label: string; icon: ReactNode; badge?: number; external?: boolean; match?: (p: string) => boolean };
type Section = { title?: string; items: Item[] };
type Account = { name: string | null; email: string | null; avatarUrl: string | null; accountType: Variant };

const ICON = { size: 17, strokeWidth: 1.8, "aria-hidden": true } as const;

export function WorkspaceSidebar({ variant: variantProp, inboxBadge }: { variant?: Variant; inboxBadge?: number }) {
  const pathname = usePathname() ?? "";
  const [variant, setVariant] = useState<Variant | null>(variantProp ?? null);
  const [unread, setUnread] = useState(0);
  const [kitSlug, setKitSlug] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);

  // Profile for the account row (and the variant, when the page didn't pass one).
  // For brands the API already returns companyName as `name` and the logo as `avatarUrl`.
  useEffect(() => {
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!p) return;
        setAccount({ name: p.name ?? null, email: p.email ?? null, avatarUrl: p.avatarUrl ?? null, accountType: p.accountType === "brand" ? "brand" : "creator" });
        if (!variantProp) setVariant(p.accountType === "brand" ? "brand" : "creator");
      })
      .catch(() => {
        if (!variantProp) setVariant("creator");
      });
  }, [variantProp]);

  // Avatar/logo uploads elsewhere fire this; keep the row in sync without a refetch.
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const url = (e as CustomEvent<{ avatarUrl: string }>).detail?.avatarUrl;
      setAccount((a) => (a ? { ...a, avatarUrl: url || null } : a));
    };
    window.addEventListener("kitevo:avatar-updated", onUpdate);
    return () => window.removeEventListener("kitevo:avatar-updated", onUpdate);
  }, []);

  // Admin-only footer link. Non-admins get { admin: false } and never see it.
  useEffect(() => {
    fetch("/api/me/admin", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setIsAdmin(d?.admin === true))
      .catch(() => {});
  }, []);

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
            href: "/campaigns",
            label: "Campaigns",
            icon: <Megaphone {...ICON} />,
            match: (p) => p.startsWith("/campaigns"),
          },
          { href: "/messages", label: "Messages", icon: <MessageCircle {...ICON} />, badge },
        ],
      },
      { title: "Grow", items: [earn] },
    ],
    footer: [
      ...(kitSlug ? [{ href: `/kit/${kitSlug}`, label: "View my kit", icon: <ArrowUpRight {...ICON} />, external: true }] : []),
      { href: "/pricing", label: "Plan & billing", icon: <CreditCard {...ICON} /> },
      { href: "/settings", label: "Settings", icon: <Settings {...ICON} /> },
    ],
    mobile: [],
  };
  creator.mobile = [
    { href: "/dashboard", label: "Home", icon: <House {...ICON} /> },
    creator.sections[1].items[0],
    { ...creator.sections[1].items[1], label: "Messages" },
    { ...earn, label: "Earn" },
    { href: "/settings", label: "Settings", icon: <Settings {...ICON} /> },
  ];

  const brandInbox: Item = { href: "/messages", label: "Messages", icon: <MessageCircle {...ICON} />, badge };
  const brand: { sections: Section[]; footer: Item[]; mobile: Item[] } = {
    sections: [
      {
        items: [
          { href: "/discover", label: "Discover", icon: <Compass {...ICON} /> },
          {
            href: "/campaigns",
            label: "Campaigns",
            icon: <Megaphone {...ICON} />,
            match: (p) => p.startsWith("/campaigns"),
          },
          brandInbox,
        ],
      },
      { title: "Grow", items: [earn] },
    ],
    footer: [{ href: "/settings", label: "Settings", icon: <Settings {...ICON} /> }],
    mobile: [],
  };
  brand.mobile = [...brand.sections[0].items, { ...earn, label: "Earn" }, brand.footer[0]];

  const admin: Item = { href: "/admin", label: "Admin", icon: <ShieldCheck {...ICON} />, match: (p) => p.startsWith("/admin") };
  if (isAdmin) {
    creator.footer.push(admin);
    brand.footer.push(admin);
  }

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
                  {s.title && <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{s.title}</p>}
                  <div className="flex flex-col gap-0.5">
                    {s.items.map((it) => (
                      <NavItem key={it.href} item={it} active={isActive(it)} />
                    ))}
                  </div>
                </div>
              ))}
              {/* Referral nudge — the program is the main growth loop. Hidden where the page
                  already promotes it (/referrals itself, and the dashboard's referral card). */}
              {pathname !== "/referrals" && pathname !== "/dashboard" && (
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
            <div className="border-t border-border p-3">
              <AccountRow account={account} />
            </div>
          </>
        ) : (
          // Same shape as the creator nav: Home · Social (2) · Grow (1), then the footer.
          <div className="flex flex-1 flex-col" aria-hidden>
            <div className="flex flex-1 flex-col gap-5 p-3 pt-5">
              <NavItemSkeleton width="w-14" />
              {[2, 1].map((n, g) => (
                <div key={g}>
                  <Skeleton className="mb-2.5 ml-3 h-2.5 w-12 rounded-full" />
                  <div className="flex flex-col gap-0.5">
                    {Array.from({ length: n }).map((_, i) => (
                      <NavItemSkeleton key={i} width={i ? "w-20" : "w-24"} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-0.5 border-t border-border p-3">
              {["w-24", "w-24", "w-16"].map((w, i) => (
                <NavItemSkeleton key={i} width={w} />
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Mobile bottom tabs */}
      {!variant && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-background/95 md:hidden" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-center gap-1.5 py-2.5">
              <Skeleton className="h-[17px] w-[17px] rounded-md" />
              <Skeleton className="h-2.5 w-10 rounded-full" />
            </div>
          ))}
        </div>
      )}
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
                  <span className="absolute right-1/4 top-1.5 flex h-4 min-w-4 translate-x-2 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
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

/** Signed-in account at the foot of the sidebar: avatar, name, role; opens theme + log out. */
function AccountRow({ account }: { account: Account | null }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!account) {
    return (
      <div className="flex items-center gap-2.5 px-2 py-1.5" aria-hidden>
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-2.5 w-14 rounded-full" />
        </div>
      </div>
    );
  }

  const label = account.name || account.email || "Account";
  const isDark = mounted && resolvedTheme === "dark";
  const item = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none";

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-muted ${open ? "bg-muted" : ""}`}
      >
        <AvatarImg
          src={account.avatarUrl}
          alt=""
          className={`h-8 w-8 shrink-0 border border-border object-cover ${account.accountType === "brand" ? "rounded-lg" : "rounded-full"}`}
          fallback={
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center bg-muted text-xs font-semibold text-foreground ${account.accountType === "brand" ? "rounded-lg" : "rounded-full"}`}
            >
              {label.charAt(0).toUpperCase()}
            </span>
          }
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{label}</span>
          <span className="block truncate text-xs capitalize text-muted-foreground">{account.accountType}</span>
        </span>
        <ChevronsUpDown size={14} className="shrink-0 text-muted-foreground" aria-hidden />
      </button>

      {open && (
        <div role="menu" aria-label="Account" className="absolute bottom-[calc(100%+6px)] left-0 right-0 z-50 overflow-hidden rounded-xl border border-border bg-background p-1 shadow-lg">
          {account.email && <p className="truncate px-3 pb-1.5 pt-2 text-xs text-muted-foreground">{account.email}</p>}
          {mounted && (
            <button role="menuitem" type="button" className={`${item} text-foreground hover:bg-muted`} onClick={() => setTheme(isDark ? "light" : "dark")}>
              {isDark ? <Sun size={15} aria-hidden /> : <Moon size={15} aria-hidden />}
              {isDark ? "Light mode" : "Dark mode"}
            </button>
          )}
          <div className="my-1 h-px bg-border" />
          <button
            role="menuitem"
            type="button"
            className={`${item} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30`}
            onClick={async () => {
              setOpen(false);
              await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
              signOut({ callbackUrl: "/" });
            }}
          >
            <LogOut size={15} aria-hidden /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

/** Matches NavItem's box: px-3 py-2, 17px icon, label. */
function NavItemSkeleton({ width }: { width: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2">
      <Skeleton className="h-[17px] w-[17px] shrink-0 rounded-md" />
      <Skeleton className={`h-3.5 ${width} rounded-full`} />
    </div>
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
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[11px] font-bold text-white">
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
