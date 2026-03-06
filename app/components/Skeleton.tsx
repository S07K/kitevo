"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-[#E8E6E3] ${className}`}
      aria-hidden
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mt-12 space-y-8" data-testid="dashboard-skeleton">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-sm" />
        <Skeleton className="h-24 w-full rounded-sm" />
        <Skeleton className="h-32 w-full rounded-sm" />
      </div>
    </div>
  );
}

export function KitEditorSkeleton() {
  return (
    <div className="space-y-6" data-testid="kit-editor-skeleton">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-24 rounded-sm" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

export function PublicKitSkeleton() {
  return (
    <div className="pt-[calc(5rem+env(safe-area-inset-top))] pb-20 max-w-2xl mx-auto px-5 sm:px-8 space-y-8">
      <div className="text-center pt-8">
        <Skeleton className="w-28 h-28 rounded-full mx-auto" />
        <Skeleton className="h-8 w-40 mx-auto mt-4" />
        <Skeleton className="h-4 w-24 mx-auto mt-2" />
      </div>
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="aspect-[4/5] rounded-lg" />
        <Skeleton className="aspect-[4/5] rounded-lg" />
      </div>
    </div>
  );
}
