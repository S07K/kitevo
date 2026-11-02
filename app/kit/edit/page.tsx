"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Check, ExternalLink, Loader2 } from "lucide-react";
import { WorkspaceShell } from "@/app/components/workspace/WorkspaceShell";
import { Skeleton } from "@/app/components/Skeleton";
import { KitEditor, type LoadedKit, type SaveStatus } from "./KitEditor";
import { KitPreviewPane } from "./KitPreviewPane";

/** Header status chip for autosave. */
function StatusChip({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === "saving")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
        <Loader2 size={13} className="animate-spin" aria-hidden /> Saving…
      </span>
    );
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400" role="status">
        <Check size={13} aria-hidden /> Saved
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-2 text-xs text-red-700 dark:text-red-400" role="alert">
        <AlertCircle size={13} aria-hidden /> Couldn&apos;t save
        <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
          Retry
        </button>
      </span>
    );
  return <span className="text-xs text-muted-foreground">Changes save automatically</span>;
}

function KitEditContent() {
  const kitId = useSearchParams().get("id");
  const [tierId, setTierId] = useState<string | null | undefined>(undefined);
  const [kit, setKit] = useState<LoadedKit | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [version, setVersion] = useState(0);
  const retryRef = useRef<() => void>(() => {});
  const registerRetry = useCallback((fn: () => void) => {
    retryRef.current = fn;
  }, []);

  useEffect(() => {
    fetch("/api/subscription-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setTierId(d?.tierId ?? null))
      .catch(() => setTierId(null));
  }, []);

  // "Saved" fades back to the neutral hint after a moment.
  useEffect(() => {
    if (status !== "saved") return;
    const t = setTimeout(() => setStatus("idle"), 2500);
    return () => clearTimeout(t);
  }, [status]);

  const liveUrl = kit?.slug ? `/kit/${kit.slug}` : null;

  return (
    <div className="flex h-[calc(100dvh-57px)] flex-col pb-[52px] md:pb-0 lg:flex-row">
      {/* Editor column */}
      <div className="flex min-h-0 w-full flex-col border-border bg-canvas lg:w-[520px] lg:shrink-0 lg:border-r">
        <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft size={17} aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            {kit ? <p className="truncate text-sm font-semibold text-foreground">{kit.name}</p> : <Skeleton className="h-4 w-32 rounded-full" />}
            <StatusChip status={status} onRetry={() => retryRef.current()} />
          </div>
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              View live <ExternalLink size={13} aria-hidden />
            </a>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {tierId === undefined ? (
            <div className="space-y-4" aria-hidden>
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-56 w-full rounded-2xl" />
            </div>
          ) : (
            <KitEditor
              kitId={kitId}
              tierId={tierId}
              onLoaded={setKit}
              onSaved={(slug) => {
                setKit((k) => (k ? { ...k, slug } : k));
                setVersion((v) => v + 1);
              }}
              onStatusChange={setStatus}
              registerRetry={registerRetry}
            />
          )}
        </div>
      </div>

      {/* Preview column (desktop) */}
      <div className="hidden min-h-0 flex-1 flex-col bg-muted/40 lg:flex">
        <KitPreviewPane slug={kit?.slug || null} version={version} />
      </div>
    </div>
  );
}

export default function KitEditPage() {
  return (
    <WorkspaceShell width="full">
      <Suspense fallback={<div className="p-8" aria-hidden><Skeleton className="h-40 w-full max-w-lg rounded-2xl" /></div>}>
        <KitEditContent />
      </Suspense>
    </WorkspaceShell>
  );
}
