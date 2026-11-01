"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { SiInstagram, SiInstagramHex, SiYoutube, SiYoutubeHex } from "@icons-pack/react-simple-icons";
import { ArrowRight, ArrowUpRight, Check, CircleDashed, Copy, Eye, PenLine, Sparkles } from "lucide-react";
import { AvatarImg } from "@/app/components/AvatarImg";
import { Panel } from "@/app/components/workspace/WorkspaceShell";
import { Button, ButtonLink, buttonClass } from "@/app/components/workspace/Button";
import { Badge } from "@/app/components/Badge";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { vibeFor } from "./KitActions";
import { Skeleton } from "@/app/components/Skeleton";

/* ─── Kit spotlight ──────────────────────────────────────────────────────── */

/** The creator's main kit as the centrepiece of their workspace: a poster-style thumbnail
 *  plus the actions they use daily (edit, view, copy link). Only real data is shown. */
export function KitSpotlight({
  kit,
  name,
  avatarUrl,
  niches,
  viewsThisWeek,
  viewsLoaded,
  kitCount,
  menu,
  verifiedTier,
}: {
  kit: { id: string; slug: string; name: string; appearance?: unknown; hasPassword?: boolean };
  name: string;
  avatarUrl: string | null;
  niches: string[];
  viewsThisWeek: number;
  viewsLoaded: boolean;
  kitCount: number;
  /** Overflow menu (share, URL, password, delete). */
  menu?: ReactNode;
  /** Verified tick, shown next to the name exactly as brands see it on the live kit. */
  verifiedTier?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const vibe = vibeFor(kit);
  // Rendered only after the dashboard's client-side data load, so window exists.
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));
  const url = `${origin}/kit/${kit.slug}`;
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "·";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  // No overflow-hidden: the "…" menu drops out of the card, so corners are rounded per side.
  return (
    <section className="rounded-2xl border border-border bg-background">
      <div className="flex flex-col sm:flex-row">
        {/* Poster */}
        {/* Poster in the kit's own vibe, so it reads as the kit, not a generic card */}
        <div
          className="relative flex shrink-0 flex-col items-center justify-center rounded-t-[15px] px-8 py-8 sm:w-60 sm:rounded-l-[15px] sm:rounded-tr-none"
          style={{ backgroundColor: vibe.bg, color: vibe.fg }}
        >
          <span
            className="absolute left-3 top-3 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ backgroundColor: vibe.fg + "1f" }}
          >
            {vibe.label}
          </span>
          <span className="flex rounded-full p-1" style={{ backgroundColor: vibe.fg + "26" }}>
            <AvatarImg
              src={avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
              fallback={
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full font-display text-xl"
                  style={{ backgroundColor: vibe.fg + "1f" }}
                >
                  {initials}
                </span>
              }
            />
          </span>
          <p className="mt-3 flex max-w-full items-center gap-1.5 font-display text-lg font-semibold tracking-tight">
            <span className="truncate">{name || "Your name"}</span>
            <VerifiedBadge tier={verifiedTier} size="sm" />
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-1">
            {niches.slice(0, 3).map((n) => (
              <span key={n} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: vibe.fg + "1f" }}>
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-5 p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="success" dot>Live</Badge>
              {kit.hasPassword && <Badge variant="warning">Private</Badge>}
              {kitCount > 1 && <span className="text-xs text-muted-foreground">Main kit · 1 of {kitCount}</span>}
              {menu && <div className="-my-1 -mr-2 ml-auto">{menu}</div>}
            </div>
            <h2 className="mt-2 truncate font-display text-xl font-semibold tracking-tight text-foreground">{kit.name}</h2>
            <button
              type="button"
              onClick={copy}
              className="group mt-1 flex max-w-full items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              title="Copy link"
            >
              <span className="truncate">{url.replace(/^https?:\/\//, "") || `/kit/${kit.slug}`}</span>
              {copied ? <Check size={12} className="shrink-0 text-green-600 dark:text-green-400" aria-hidden /> : <Copy size={12} className="shrink-0 opacity-60 group-hover:opacity-100" aria-hidden />}
            </button>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{kitCount > 1 ? "Views this week · all kits" : "Views this week"}</p>
              <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums tracking-tight text-foreground">{viewsLoaded ? viewsThisWeek.toLocaleString() : "—"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ButtonLink variant="primary" href={`/kit/edit?id=${encodeURIComponent(kit.id)}`}>
                <PenLine size={14} aria-hidden /> Edit kit
              </ButtonLink>
              <a href={`/kit/${kit.slug}`} target="_blank" rel="noopener noreferrer" className={buttonClass()}>
                <Eye size={14} aria-hidden /> View
              </a>
              <Button onClick={copy} aria-live="polite">
                {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Setup checklist ────────────────────────────────────────────────────── */

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
  onClick?: () => void | Promise<void>;
  cta: string;
  /** Shown in place of the CTA for a moment after onClick, e.g. "Copied". */
  feedback?: string;
};

/** "Finish your kit" progress list. Hides itself once everything is done. */
export function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const [flash, setFlash] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const run = async (it: ChecklistItem) => {
    await it.onClick?.();
    if (!it.feedback) return;
    setFlash(it.id);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(null), 2000);
  };
  const done = items.filter((i) => i.done).length;
  if (done === items.length) return null;
  const pct = Math.round((done / items.length) * 100);
  return (
    <Panel
      title="Finish your kit"
      action={<span className="text-xs font-medium tabular-nums text-muted-foreground">{done}/{items.length}</span>}
      bodyClassName="p-2"
    >
      <div className="px-3 pb-2 pt-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ul>
        {items.map((it) => {
          const inner = (
            <>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${it.done ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {it.done ? <Check size={12} strokeWidth={3} aria-hidden /> : <CircleDashed size={18} strokeWidth={1.6} aria-hidden />}
              </span>
              <span className={`min-w-0 flex-1 truncate text-sm ${it.done ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground"}`}>
                {it.label}
              </span>
              {!it.done &&
                (flash === it.id ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400" aria-live="polite">
                    <Check size={12} aria-hidden /> {it.feedback}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs font-medium text-muted-foreground group-hover:text-foreground">{it.cta} →</span>
                ))}
            </>
          );
          const cls = "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/60";
          return (
            <li key={it.id}>
              {it.done ? (
                <div className={cls.replace("hover:bg-muted/60", "")}>{inner}</div>
              ) : it.href ? (
                <Link href={it.href} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button type="button" onClick={() => run(it)} className={cls}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ─── Opportunities ──────────────────────────────────────────────────────── */

type Campaign = {
  id: string;
  title: string;
  niche: string | null;
  budget: string | null;
  brand: { name: string | null; brandProfile: { companyName: string } | null };
};

/** Newest open brand campaigns, preferring the creator's niches. */
export function OpportunitiesPanel({ niches }: { niches: string[] }) {
  const [items, setItems] = useState<Campaign[] | null>(null);
  useEffect(() => {
    fetch("/api/social/campaigns", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d: Campaign[]) => {
        const list = Array.isArray(d) ? d : [];
        const mine = list.filter((c) => c.niche && niches.includes(c.niche));
        setItems([...mine, ...list.filter((c) => !mine.includes(c))].slice(0, 3));
      })
      .catch(() => setItems([]));
  }, [niches]);

  return (
    <Panel
      title="Opportunities"
      action={
        <Link href="/campaigns" className="text-xs font-medium text-muted-foreground hover:text-foreground">
          All campaigns
        </Link>
      }
      bodyClassName="p-2"
    >
      {items === null ? (
        <div aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className={`h-3.5 rounded-full ${i ? "w-2/5" : "w-3/5"}`} />
                <Skeleton className="h-3 w-4/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-3 py-6 text-center">
          <Sparkles size={18} className="mx-auto text-muted-foreground" aria-hidden />
          <p className="mt-2 text-sm text-foreground">No open campaigns right now</p>
          <p className="mt-0.5 text-xs text-muted-foreground">New briefs from brands show up here.</p>
        </div>
      ) : (
        <ul>
          {items.map((c) => (
            <li key={c.id}>
              <Link href={`/campaigns/${c.id}`} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                  {(c.brand.brandProfile?.companyName ?? c.brand.name ?? "B")[0]?.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{c.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {c.brand.brandProfile?.companyName ?? c.brand.name}
                    {c.niche ? ` · ${c.niche}` : ""}
                    {c.budget ? ` · ${c.budget}` : ""}
                  </span>
                </span>
                <ArrowRight size={14} className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ─── Connections ────────────────────────────────────────────────────────── */

export function ConnectionsPanel({
  instagram,
  youtube,
  isPaidTier,
  onDisconnectInstagram,
  onDisconnectYoutube,
  busy,
}: {
  instagram: { connected: boolean; detail?: string };
  youtube: { connected: boolean; detail?: string };
  isPaidTier: boolean;
  onDisconnectInstagram: () => void;
  onDisconnectYoutube: () => void;
  busy: { instagram: boolean; youtube: boolean };
}) {
  const rows: Array<{ key: "instagram" | "youtube"; name: string; icon: ReactNode; connected: boolean; detail: string; href: string; off: () => void }> = [
    {
      key: "instagram",
      name: "Instagram",
      icon: <SiInstagram size={18} color={SiInstagramHex} title="Instagram" />,
      connected: instagram.connected,
      detail: instagram.detail ?? (instagram.connected ? "Connected" : "Followers, engagement, Reels"),
      href: "/api/instagram/connect",
      off: onDisconnectInstagram,
    },
    {
      key: "youtube",
      name: "YouTube",
      icon: <SiYoutube size={18} color={SiYoutubeHex} title="YouTube" />,
      connected: youtube.connected,
      detail: youtube.detail ?? (youtube.connected ? "Connected" : "Subscribers, views, videos"),
      href: "/api/youtube/connect",
      off: onDisconnectYoutube,
    },
  ];
  return (
    <Panel title="Connections" bodyClassName="p-2">
      <div id="integrations" className="scroll-mt-24" />
      {rows.map((r) => (
        <div key={r.key} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">{r.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-foreground">{r.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{r.detail}</span>
          </span>
          {r.connected ? (
            <button
              type="button"
              onClick={r.off}
              disabled={busy[r.key]}
              aria-label={`Disconnect ${r.name}`}
              className={buttonClass({ variant: "ghost", size: "sm" })}
            >
              {busy[r.key] ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : (
            <a href={r.href} aria-label={`Connect ${r.name}`} className={buttonClass({ variant: "secondary", size: "sm" })}>
              Connect
            </a>
          )}
        </div>
      ))}
      {!isPaidTier && (
        <p className="px-3 pb-2 pt-1 text-xs leading-relaxed text-muted-foreground">
          Live stats on your public kit are a Starter feature. Connect now; they appear when you upgrade.
        </p>
      )}
    </Panel>
  );
}

/* ─── Plan ───────────────────────────────────────────────────────────────── */

export function PlanPanel({
  tierId,
  tierName,
  kitsUsed,
  kitsAllowed,
  onManageBilling,
  managing,
  onUpgradeToPro,
  upgrading,
}: {
  tierId: string | null;
  tierName: string | null;
  /** Omit where the kit count isn't loaded (e.g. Settings): shows "N kits included". */
  kitsUsed?: number;
  kitsAllowed: number;
  onManageBilling: (() => void) | null;
  managing: boolean;
  onUpgradeToPro: () => void;
  upgrading: boolean;
}) {
  const next =
    tierId === "free"
      ? { label: "Upgrade to Starter", blurb: "Live stats, growth charts and audience demographics on your kit.", href: "/pricing?plan=starter" }
      : tierId === "starter"
        ? { label: "Upgrade to Pro", blurb: "3 kits, every kit style, verified tick and a brand inquiry inbox.", action: onUpgradeToPro }
        : null;
  return (
    <Panel title="Plan">
      <div className="flex items-baseline justify-between">
        <p className="font-display text-lg font-semibold text-foreground">{tierName ?? "Free"}</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {kitsUsed === undefined
            ? `${kitsAllowed} kit${kitsAllowed === 1 ? "" : "s"} included`
            : `${kitsUsed}/${kitsAllowed} kit${kitsAllowed === 1 ? "" : "s"}`}
        </p>
      </div>
      {next ? (
        <>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{next.blurb}</p>
          {"href" in next && next.href ? (
            <ButtonLink variant="primary" href={next.href} className="mt-4 w-full">
              {next.label} <ArrowUpRight size={14} aria-hidden />
            </ButtonLink>
          ) : (
            <Button variant="primary" onClick={next.action} disabled={upgrading} className="mt-4 w-full">
              {upgrading ? "Upgrading…" : next.label}
            </Button>
          )}
        </>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">You&apos;re on the top creator plan.</p>
      )}
      {onManageBilling && (
        <button type="button" onClick={onManageBilling} disabled={managing} className="mt-3 w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50">
          {managing ? "Opening…" : "Manage billing"}
        </button>
      )}
    </Panel>
  );
}
