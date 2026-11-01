"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { SiInstagram, SiInstagramHex, SiYoutube, SiYoutubeHex } from "@icons-pack/react-simple-icons";
import { ArrowRight, ArrowUpRight, Check, CircleDashed, Copy, Eye, PenLine, Sparkles } from "lucide-react";
import { AvatarImg } from "@/app/components/AvatarImg";
import { Panel } from "@/app/components/workspace/WorkspaceShell";

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
}: {
  kit: { id: string; slug: string; name: string };
  name: string;
  avatarUrl: string | null;
  niches: string[];
  viewsThisWeek: number;
  viewsLoaded: boolean;
  kitCount: number;
}) {
  const [copied, setCopied] = useState(false);
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

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex flex-col sm:flex-row">
        {/* Poster */}
        <div className="relative flex shrink-0 flex-col items-center justify-center bg-gradient-to-br from-muted via-muted/60 to-background px-8 py-8 sm:w-60">
          <AvatarImg
            src={avatarUrl}
            alt=""
            className="h-16 w-16 rounded-full object-cover ring-4 ring-background"
            fallback={
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background font-display text-xl text-muted-foreground ring-4 ring-background">
                {initials}
              </div>
            }
          />
          <p className="mt-3 max-w-full truncate font-display text-lg font-semibold tracking-tight text-foreground">{name || "Your name"}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-1">
            {niches.slice(0, 3).map((n) => (
              <span key={n} className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-5 p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden /> Live
              </span>
              {kitCount > 1 && <span className="text-xs text-muted-foreground">1 of {kitCount} kits</span>}
            </div>
            <h2 className="mt-2 truncate text-xl font-semibold tracking-tight text-foreground">{kit.name}</h2>
            <button
              type="button"
              onClick={copy}
              className="group mt-1 flex max-w-full items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              title="Copy link"
            >
              <span className="truncate">{url.replace(/^https?:\/\//, "") || `/kit/${kit.slug}`}</span>
              {copied ? <Check size={12} className="shrink-0 text-green-600" /> : <Copy size={12} className="shrink-0 opacity-60 group-hover:opacity-100" />}
            </button>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Views this week</p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{viewsLoaded ? viewsThisWeek : "—"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/kit/edit?id=${encodeURIComponent(kit.id)}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-85"
              >
                <PenLine size={14} aria-hidden /> Edit kit
              </Link>
              <a
                href={`/kit/${kit.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <Eye size={14} aria-hidden /> View
              </a>
              <button
                type="button"
                onClick={copy}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Setup checklist ────────────────────────────────────────────────────── */

export type ChecklistItem = { id: string; label: string; done: boolean; href?: string; onClick?: () => void; cta: string };

/** "Finish your kit" progress list. Hides itself once everything is done. */
export function SetupChecklist({ items }: { items: ChecklistItem[] }) {
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
          <div className="h-full rounded-full bg-foreground transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ul>
        {items.map((it) => {
          const inner = (
            <>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${it.done ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                {it.done ? <Check size={12} strokeWidth={3} aria-hidden /> : <CircleDashed size={18} strokeWidth={1.6} aria-hidden />}
              </span>
              <span className={`min-w-0 flex-1 truncate text-sm ${it.done ? "text-muted-foreground line-through decoration-muted-foreground/40" : "text-foreground"}`}>
                {it.label}
              </span>
              {!it.done && <span className="shrink-0 text-xs font-medium text-muted-foreground group-hover:text-foreground">{it.cta} →</span>}
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
                <button type="button" onClick={it.onClick} className={cls}>
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
        <div className="space-y-2 p-3" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
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
              className="h-8 shrink-0 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              {busy[r.key] ? "…" : "Disconnect"}
            </button>
          ) : (
            <a href={r.href} className="inline-flex h-8 shrink-0 items-center rounded-full bg-foreground px-3.5 text-xs font-medium text-background transition-opacity hover:opacity-85">
              Connect
            </a>
          )}
        </div>
      ))}
      {!isPaidTier && (
        <p className="px-3 pb-2 pt-1 text-[11px] leading-relaxed text-muted-foreground">
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
  kitsUsed: number;
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
        <p className="text-lg font-semibold text-foreground">{tierName ?? "Free"}</p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {kitsUsed}/{kitsAllowed} kit{kitsAllowed === 1 ? "" : "s"}
        </p>
      </div>
      {next ? (
        <>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{next.blurb}</p>
          {"href" in next && next.href ? (
            <Link href={next.href} className="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-85">
              {next.label} <ArrowUpRight size={14} aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              onClick={next.action}
              disabled={upgrading}
              className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-full bg-foreground text-sm font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {upgrading ? "Upgrading…" : next.label}
            </button>
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
