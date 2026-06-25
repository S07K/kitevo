"use client";

import { useEffect, useRef, useState } from "react";

// ─── Shimmer primitive ────────────────────────────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent ${className}`}
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
    <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
      {/* sidebar */}
      <div className="space-y-4">
        <SidebarCardSkeleton />
        <SidebarCardSkeleton />
        <SidebarCardSkeleton />
      </div>
      {/* main */}
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
    <div className="pt-[calc(5rem+env(safe-area-inset-top))] pb-20 max-w-2xl mx-auto px-5 sm:px-8 space-y-8">
      <div className="text-center pt-8">
        <Skeleton className="w-28 h-28 rounded-full mx-auto" />
        <Skeleton className="h-8 w-40 mx-auto mt-4 rounded-full" />
        <Skeleton className="h-4 w-24 mx-auto mt-2 rounded-full" />
      </div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="aspect-[4/5] rounded-2xl" />
        <Skeleton className="aspect-[4/5] rounded-2xl" />
      </div>
    </div>
  );
}
