"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { AppNav } from "@/app/components/AppNav";
import { KitEditor } from "@/app/dashboard/KitEditor";

function KitEditContent() {
  const searchParams = useSearchParams();
  const kitId = searchParams.get("id");
  const [tierId, setTierId] = useState<string | null>(null);
  const [tierLoaded, setTierLoaded] = useState(false);
  const [kitSlug, setKitSlug] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);


  useEffect(() => {
    fetch("/api/subscription-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setTierId(data.tierId ?? null); })
      .catch(() => {})
      .finally(() => setTierLoaded(true));
  }, []);

  // Fetch kit slug on mount
  useEffect(() => {
    if (!kitId) return;
    fetch(`/api/kits/${kitId}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.slug) setKitSlug(data.slug); })
      .catch(() => {});
  }, [kitId]);

  const handleSaved = (slug: string) => {
    setKitSlug(slug);
    setPreviewKey((k) => k + 1);
  };

  const previewUrl = kitSlug ? `/kit/${kitSlug}?preview=1` : null;
  const liveUrl = kitSlug ? `/kit/${kitSlug}` : null;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
      {/* ── Editor panel ── */}
      <div className="w-full lg:w-[460px] lg:shrink-0 overflow-y-auto border-r border-border bg-muted/20">
        <div className="px-5 sm:px-6 pt-6 pb-24">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Dashboard
            </Link>
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" x2="21" y1="14" y2="3" />
                </svg>
                View live
              </a>
            )}
          </div>
          {tierLoaded
            ? <KitEditor kitId={kitId} tierId={tierId} onSaved={handleSaved} />
            : <div className="space-y-4 animate-pulse"><div className="h-8 bg-muted rounded-xl w-1/2" /><div className="h-32 bg-muted rounded-2xl" /><div className="h-48 bg-muted rounded-2xl" /></div>
          }
        </div>
      </div>

      {/* ── Preview panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col flex-1 overflow-hidden bg-muted/10">
        {/* Preview toolbar */}
        <div className="flex items-center justify-between border-b border-border px-5 py-2.5 shrink-0 bg-background">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-xs font-medium text-muted-foreground">Live preview</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Saves automatically refresh</span>
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-3 py-1 text-xs font-medium hover:opacity-80 transition-opacity"
              >
                Open in new tab ↗
              </a>
            )}
          </div>
        </div>

        {/* iframe */}
        <div className="flex-1 overflow-hidden relative">
          {previewUrl ? (
            <>
              <iframe
                ref={iframeRef}
                key={previewKey}
                src={previewUrl}
                className="w-full h-full border-0 pointer-events-none"
                title="Kit preview"
              />
              {/* Forwards scroll to iframe, blocks all clicks */}
              <div
                className="absolute inset-0"
                onWheel={(e) => {
                  iframeRef.current?.contentWindow?.scrollBy({ top: e.deltaY, behavior: "instant" });
                }}
              />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center px-8">
              <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Preview will appear here</p>
                <p className="text-xs text-muted-foreground mt-1">Save your kit to see a live preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function KitEditPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppNav
        links={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/pricing", label: "Pricing" },
        ]}
        onLogout={async () => {
          await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
          signOut({ callbackUrl: "/" });
        }}
      />
      <div className="flex-1 pt-16">
        <Suspense fallback={<div className="p-8 text-muted-foreground text-sm">Loading…</div>}>
          <KitEditContent />
        </Suspense>
      </div>
    </div>
  );
}
