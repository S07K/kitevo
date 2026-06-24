"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { AppNav } from "@/app/components/AppNav";
import { KitEditor } from "@/app/dashboard/KitEditor";

function KitEditContent() {
  const searchParams = useSearchParams();
  const kitId = searchParams.get("id");
  const [tierId, setTierId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subscription-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setTierId(data.tierId ?? null); })
      .catch(() => {});
  }, []);

  return (
    <>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to dashboard
        </Link>
      </div>
      <KitEditor kitId={kitId} tierId={tierId} />
    </>
  );
}

export default function KitEditPage() {
  return (
    <div className="min-h-screen bg-muted/20">
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

      <main className="mx-auto max-w-4xl px-5 pb-24 pt-24 sm:px-8 lg:px-10">
        <Suspense fallback={<div className="text-muted-foreground text-sm">Loading…</div>}>
          <KitEditContent />
        </Suspense>
      </main>
    </div>
  );
}
