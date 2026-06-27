"use client";

import { useEffect, useRef, useState } from "react";

// ─── Shimmer primitive ────────────────────────────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.06] before:to-transparent ${className}`}
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
  className?: string;
}

export function CountUp({
  value,
  decimals = 0,
  duration = 1200,
  suffix = "",
  prefix = "",
  className = "",
}: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    function ease(t: number) {
      // ease-out cubic
      return 1 - Math.pow(1 - t, 3);
    }

    function tick(now: number) {
      if (!startRef.current) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setDisplay(parseFloat((ease(progress) * value).toFixed(decimals)));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, decimals, duration]);

  const formatted =
    decimals === 0
      ? display.toLocaleString()
      : display.toFixed(decimals);

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

// ─── Dashboard skeletons ──────────────────────────────────────────────────────

export function StatCardSkeleton() {
  return (
    <div className="bg-background border-border rounded-2xl border p-6 py-5">
      <Skeleton className="h-3 w-20 rounded-full" />
      <Skeleton className="mt-4 h-9 w-28 rounded-full" />
      <Skeleton className="mt-2 h-3 w-16 rounded-full" />
      <div className="mt-4 flex gap-4">
        <div>
          <Skeleton className="h-4 w-10 rounded-full" />
          <Skeleton className="mt-1 h-3 w-14 rounded-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-10 rounded-full" />
          <Skeleton className="mt-1 h-3 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function KitCardSkeleton() {
  return (
    <div className="bg-background border-border rounded-2xl border overflow-hidden">
      <Skeleton className="h-2 w-full rounded-none" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-4 w-32 rounded-full" />
        <Skeleton className="h-3 w-24 rounded-full" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-8 w-16 rounded-full" />
          <Skeleton className="h-8 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function SidebarCardSkeleton() {
  return (
    <div className="bg-background border-border rounded-2xl border p-6 space-y-3">
      <Skeleton className="h-3 w-24 rounded-full" />
      <Skeleton className="h-8 w-32 rounded-full" />
      <Skeleton className="h-3 w-40 rounded-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-[#111110] dark:bg-[#1c1c1a] dark:border dark:border-[#2a2a28] px-6 py-5 flex items-center gap-4">
        <div className="h-11 w-11 rounded-full shrink-0 bg-white/15" />
        <div className="space-y-2 flex-1">
          <div className="h-2.5 w-20 rounded-full bg-white/20" />
          <div className="h-5 w-36 rounded-full bg-white/25" />
        </div>
        <div className="h-8 w-24 rounded-full bg-white/15 shrink-0" />
      </div>

      {/* Metrics bar */}
      <div className="bg-background border border-border rounded-2xl grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-6 py-5 space-y-2">
            <Skeleton className="h-2.5 w-20 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-2 w-14 rounded-full" />
          </div>
        ))}
      </div>

      {/* Pipeline / Activity — full width */}
      <div className="bg-background border border-border rounded-2xl p-6">
        {/* Tab row */}
        <div className="flex items-center gap-2 mb-5">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        {/* Kanban columns */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-2.5 w-14 rounded-full" />
              </div>
              <div className="min-h-[120px] rounded-2xl bg-muted/40 p-3 space-y-2">
                {i < 2 && (
                  <>
                    <Skeleton className="h-16 w-full rounded-xl" />
                    {i === 0 && <Skeleton className="h-16 w-full rounded-xl" />}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kits — full width */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-2.5 w-16 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KitCardSkeleton />
          <KitCardSkeleton />
          <KitCardSkeleton />
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
