"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WorkspaceShell, PageHeader } from "@/app/components/workspace/WorkspaceShell";
import { Button } from "@/app/components/workspace/Button";
import { EMPTY_QUOTE, QuoteForm, quotePayload, type QuoteDraft } from "@/app/components/deals/QuoteForm";

const field =
  "w-full min-w-0 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";

export function NewDealForm({ source, refId, counterpart, isBrand, defaultTitle }: { source: string; refId: string; counterpart: string | null; isBrand: boolean; defaultTitle: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [brandName, setBrandName] = useState("");
  const [brandEmail, setBrandEmail] = useState("");
  const [quote, setQuote] = useState<QuoteDraft>(EMPTY_QUOTE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const direct = source === "direct";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ source, ref: refId, title, brandName, brandEmail, quote: quotePayload(quote) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return setError({ field: data.field, message: data.error ?? "Couldn't send. Try again." });
      router.push(`/deals/${data.id}`);
    } catch {
      setError({ message: "Couldn't reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }
  const err = (f: string) => (error?.field === f ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error.message}</p> : null);

  return (
    <WorkspaceShell width="default">
      <p className="mb-3 text-xs"><Link href="/deals" className="text-muted-foreground hover:text-foreground">← All deals</Link></p>
      <PageHeader
        eyebrow="New deal"
        title={isBrand ? "Send an offer" : "Send a quote"}
        description={`${counterpart ? `To ${counterpart}. ` : ""}They can accept, counter or decline. Once accepted, the terms are locked and ${isBrand ? "you pay the creator" : "the brand pays you"} directly. Kitevo takes 0%.`}
      />
      <form onSubmit={submit} className="space-y-6 rounded-2xl border border-border bg-background p-5 sm:p-6">
        <div>
          <label htmlFor="d-title" className="mb-1.5 block text-xs font-medium text-muted-foreground">Deal name</label>
          <input id="d-title" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali launch Reel" className={field} />
          {err("title")}
        </div>
        {direct && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="d-brand" className="mb-1.5 block text-xs font-medium text-muted-foreground">Brand</label>
              <input id="d-brand" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Glowfield Skincare" className={field} />
              {err("brandName")}
            </div>
            <div>
              <label htmlFor="d-email" className="mb-1.5 block text-xs font-medium text-muted-foreground">Brand contact&apos;s email</label>
              <input id="d-email" type="email" value={brandEmail} onChange={(e) => setBrandEmail(e.target.value)} placeholder="partnerships@brand.com" className={field} />
              {err("brandEmail")}
              <p className="mt-1 text-xs text-muted-foreground">They get a private link to review and pay. No account needed.</p>
            </div>
          </div>
        )}
        <QuoteForm value={quote} onChange={setQuote} error={error} />
        {error && !error.field && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error.message}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-5">
          <Button onClick={() => router.back()} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>{busy ? "Sending…" : isBrand ? "Send offer" : "Send quote"}</Button>
        </div>
      </form>
    </WorkspaceShell>
  );
}
