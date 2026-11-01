"use client";

import { useEffect, useRef, useState } from "react";

// ─── Shimmer primitive ────────────────────────────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
  // Defaults apply only when the caller doesn't set them, so `rounded-full` / a custom bg
  // never fight the defaults on CSS order.
  const radius = /(^|\s)rounded(-|\s|$)/.test(className) ? "" : "rounded-xl";
  const bg = /(^|\s)bg-/.test(className) ? "" : "bg-muted";
  return (
    <div
      className={`relative overflow-hidden ${radius} ${bg} before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.06] before:to-transparent ${className}`}
      aria-hidden
    />
  );
}

// ─── CountUp ─────────────────────────────────────────────────────────────────

interface CountUpProps {
  value: number;
  /** Decimal places. Default 0. */
  decimals?: number;
  /** Duration in ms. Default 1200. */
  duration?: number;
  /** Suffix appended after the number, e.g. "%" */
  suffix?: string;
  /** Prefix prepended before the number, e.g. "$" */
  prefix?: string;
  /** Abbreviate large numbers: 15536 → "15.5K", 342900 → "342.9K", 1200000 → "1.2M". */
  compact?: boolean;
  className?: string;
}

/** Short, scannable number formatting for stat tiles. */
export function formatCompactNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return Math.round(n).toLocaleString();
}

export function CountUp({
  value,
  decimals = 0,
  duration = 1200,
  suffix = "",
  prefix = "",
  compact = false,
  className = "",
}: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    doneRef.current = false;

    // Respect reduced motion: show the real number immediately, no count-up.
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplay(value);
      return;
    }

    function ease(t: number) {
      // ease-out cubic
      return 1 - Math.pow(1 - t, 3);
    }

    function tick(now: number) {
      if (doneRef.current) return;
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(parseFloat((ease(progress) * value).toFixed(decimals)));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        doneRef.current = true;
        setDisplay(value);
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    // Safety net: rAF is paused in background tabs and can be heavily throttled. Without this
    // the number could sit at 0 — the worst possible failure for a kit selling real stats.
    // Mark done + cancel the loop so a late frame can't rewind the value.
    const fallback = setTimeout(() => {
      doneRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setDisplay(value);
    }, duration + 200);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(fallback);
    };
  }, [value, decimals, duration]);

  const formatted = compact
    ? formatCompactNumber(display)
    : decimals === 0
      ? display.toLocaleString()
      : display.toFixed(decimals);

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

// ─── Workspace skeletons ──────────────────────────────────────────────────────
// Each mirrors the real component's box model (padding, heights, radii) so swapping
// skeleton → content doesn't shift the layout.

/** PageHeader: eyebrow · serif title · one-line description. */
export function PageHeaderSkeleton({ description = true }: { description?: boolean }) {
  return (
    <div className="mb-8" aria-hidden>
      <Skeleton className="h-3 w-28 rounded-full" />
      <Skeleton className="mt-3 h-8 w-64 max-w-full rounded-full sm:h-9" />
      {description && <Skeleton className="mt-3 h-3.5 w-80 max-w-full rounded-full" />}
    </div>
  );
}

/** Panel: header row (title + optional action) and a body of icon rows. */
export function PanelSkeleton({
  rows = 2,
  titleWidth = "w-24",
  action = false,
  row = "item",
}: {
  rows?: number;
  titleWidth?: string;
  action?: boolean;
  /** item: icon + two lines · check: checklist row · button: icon + two lines + pill */
  row?: "item" | "check" | "button";
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background" aria-hidden>
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-6">
        <Skeleton className={`h-3.5 ${titleWidth} rounded-full`} />
        {action && <Skeleton className="h-3 w-16 rounded-full" />}
      </div>
      <div className="p-2">
        {row === "check" && (
          <div className="px-3 pb-2 pt-2">
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        )}
        {Array.from({ length: rows }).map((_, i) =>
          row === "check" ? (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className={`h-3.5 flex-1 rounded-full ${i % 2 ? "max-w-[55%]" : "max-w-[70%]"}`} />
              <Skeleton className="ml-auto h-3 w-10 rounded-full" />
            </div>
          ) : (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className={`h-3.5 rounded-full ${i % 2 ? "w-2/5" : "w-3/5"}`} />
                <Skeleton className="h-3 w-4/5 rounded-full" />
              </div>
              {row === "button" && <Skeleton className="h-8 w-20 rounded-full" />}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

/** KitSpotlight: vibe poster (avatar, name, niches) + details (badge, title, URL, views, actions). */
export function KitSpotlightSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-background" aria-hidden>
      <div className="flex flex-col sm:flex-row">
        <div className="flex shrink-0 flex-col items-center justify-center rounded-t-[15px] bg-muted/60 px-8 py-8 sm:w-60 sm:rounded-l-[15px] sm:rounded-tr-none">
          <Skeleton className="h-[72px] w-[72px] rounded-full bg-foreground/[0.06]" />
          <Skeleton className="mt-3 h-5 w-28 rounded-full bg-foreground/[0.06]" />
          <div className="mt-2 flex gap-1">
            <Skeleton className="h-4 w-12 rounded-full bg-foreground/[0.06]" />
            <Skeleton className="h-4 w-14 rounded-full bg-foreground/[0.06]" />
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-5 p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="ml-auto h-9 w-9 rounded-full" />
            </div>
            <Skeleton className="mt-2 h-6 w-48 max-w-full rounded-full" />
            <Skeleton className="mt-2 h-3 w-40 max-w-full rounded-full" />
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="mt-1.5 h-7 w-12 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-[76px] rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Audience tiles strip (gap-px cells, same as the live metrics grid). */
export function MetricsSkeleton({ tiles = 3 }: { tiles?: number }) {
  const cols = tiles === 1 ? "grid-cols-1" : tiles === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3";
  return (
    <div className={`grid gap-px overflow-hidden rounded-2xl border border-border bg-border ${cols}`} aria-hidden>
      {Array.from({ length: tiles }).map((_, i) => (
        <div key={i} className="bg-background px-6 py-5">
          <Skeleton className="h-2.5 w-20 rounded-full" />
          <Skeleton className="mt-3 h-6 w-16 rounded-full" />
          <Skeleton className="mt-2 h-3 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Activity section: section title, chart card, recent-visits list. */
export function ActivitySkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="mb-4 h-4 w-16 rounded-full" />
      <div className="rounded-2xl border border-border bg-background p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-3 w-20 rounded-full" />
            <Skeleton className="mt-2 h-7 w-16 rounded-full" />
          </div>
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
        <Skeleton className="mt-6 h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** Secondary kit card: vibe strip + slug/views row with Edit and "…" menu. */
export function KitCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-background" aria-hidden>
      <div className="flex h-28 items-center justify-center rounded-t-2xl bg-muted/60">
        <Skeleton className="h-5 w-32 rounded-full bg-foreground/[0.06]" />
      </div>
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-3 w-14 rounded-full" />
        </div>
        <Skeleton className="h-8 w-14 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </div>
  );
}

/** Generic content card for list pages (campaigns, creators). */
export function ListCardSkeleton({ height = "h-32" }: { height?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-background p-5 ${height}`} aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-2/5 rounded-full" />
          <Skeleton className="h-3 w-1/4 rounded-full" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-3 w-11/12 rounded-full" />
      <Skeleton className="mt-2 h-3 w-3/5 rounded-full" />
    </div>
  );
}

/** Creator card on Discover: avatar, name, niches, stats, actions. */
export function CreatorCardSkeleton() {
  return (
    <div className="flex h-64 flex-col rounded-2xl border border-border bg-background p-5" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-3/5 rounded-full" />
          <Skeleton className="h-3 w-2/5 rounded-full" />
        </div>
      </div>
      <div className="mt-4 flex gap-1.5">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-3 w-full rounded-full" />
      <Skeleton className="mt-2 h-3 w-4/5 rounded-full" />
      <div className="mt-auto flex gap-2">
        <Skeleton className="h-9 flex-1 rounded-full" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </div>
  );
}

/** Conversation row in an inbox list. */
export function ConversationRowSkeleton() {
  return (
    <div className="flex h-[68px] items-center gap-3 rounded-lg px-3" aria-hidden>
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-1/2 rounded-full" />
        <Skeleton className="h-3 w-4/5 rounded-full" />
      </div>
    </div>
  );
}

/** Labelled form field (label + input). */
export function FieldSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div aria-hidden>
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className={`mt-2 w-full rounded-xl ${tall ? "h-24" : "h-11"}`} />
    </div>
  );
}

/** Creator dashboard: header, then main column + right rail exactly as rendered. */
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading your workspace">
      <PageHeaderSkeleton />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-8 lg:col-span-2">
          <KitSpotlightSkeleton />
          <div className="lg:hidden">
            <PanelSkeleton rows={4} row="check" titleWidth="w-28" action />
          </div>
          <MetricsSkeleton />
          <ActivitySkeleton />
        </div>
        <div className="min-w-0 space-y-6">
          <div className="hidden lg:block">
            <PanelSkeleton rows={5} row="check" titleWidth="w-28" action />
          </div>
          <PanelSkeleton rows={2} titleWidth="w-24" action />
          <PanelSkeleton rows={2} row="button" titleWidth="w-24" />
          <div className="overflow-hidden rounded-2xl border border-border bg-background" aria-hidden>
            <div className="border-b border-border px-5 py-3.5 sm:px-6">
              <Skeleton className="h-3.5 w-10 rounded-full" />
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-12 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-3 w-full rounded-full" />
              <Skeleton className="mt-4 h-9 w-full rounded-full" />
            </div>
          </div>
          <Skeleton className="h-[132px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function KitEditorSkeleton() {
  return (
    <div className="space-y-6" data-testid="kit-editor-skeleton">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export function PublicKitSkeleton() {
  return (
    <div className="pb-24 max-w-4xl mx-auto px-5 sm:px-8 pt-14">
      <div className="pt-6 space-y-4">
        {/* Hero banner — matches bg-[var(--mk-text)] dark card */}
        <div className="rounded-2xl bg-muted/60 px-6 py-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-foreground/10 shrink-0" />
          <div className="space-y-2">
            <div className="h-2.5 w-20 rounded-full bg-foreground/10" />
            <div className="h-5 w-36 rounded-full bg-foreground/10" />
          </div>
        </div>

        {/* Platform stats card */}
        <Skeleton className="h-24 w-full rounded-2xl" />

        {/* Work samples */}
        <Skeleton className="h-5 w-28 rounded-full mt-2" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>

        {/* Rates */}
        <Skeleton className="h-5 w-20 rounded-full mt-2" />
        <Skeleton className="h-32 w-full rounded-2xl" />

        {/* Brands */}
        <Skeleton className="h-5 w-32 rounded-full mt-2" />
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>

        {/* Growth chart */}
        <Skeleton className="h-5 w-36 rounded-full mt-2" />
        <Skeleton className="h-52 w-full rounded-2xl" />
      </div>
    </div>
  );
}
