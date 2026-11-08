"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/app/components/workspace/Button";

type Suggestion = { items: { label: string; price: number }[]; basis: string[] };

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * Copilot's rate suggestion: prices from the rate calculator's formulas applied to this kit's
 * own numbers (no AI, so nothing is made up and it doesn't use Copilot drafts). Shown for
 * review; "Use these" replaces the rate card, which the creator can then edit.
 */
export function SuggestRates({ kitId, hasRates, onUse }: { kitId: string; hasRates: boolean; onUse: (items: Suggestion["items"]) => void }) {
  const [busy, setBusy] = useState(false);
  const [s, setS] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/copilot/rates?kitId=${encodeURIComponent(kitId)}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      setS(await res.json());
    } catch {
      setError("Couldn't work out suggestions right now. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!s) {
    return (
      <div>
        <Button size="sm" variant="secondary" onClick={load} disabled={busy}>
          <Sparkles size={14} aria-hidden /> {busy ? "Working it out…" : "Suggest rates from my stats"}
        </Button>
        {error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (!s.items.length) {
    return (
      <div className="rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
        Copilot needs your follower count first. Add it in Headline numbers, or{" "}
        <Link href="/connectors" className="font-medium text-primary hover:underline">connect Instagram or YouTube</Link>.{" "}
        <button type="button" className="font-medium text-foreground underline" onClick={() => setS(null)}>Close</button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/25 bg-primary-soft/50 p-3" aria-live="polite">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary-soft-foreground">
        <Sparkles size={13} aria-hidden /> Suggested rates
      </p>
      <ul className="space-y-1 text-sm">
        {s.items.map((i) => (
          <li key={i.label} className="flex justify-between gap-3">
            <span className="min-w-0 truncate text-foreground">{i.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">{usd(i.price)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        Based on {s.basis.join(" · ")}, using the{" "}
        <Link href="/tools/rate-calculator" target="_blank" className="underline">rate calculator&apos;s rules of thumb</Link>. A starting point, not market data.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            onUse(s.items);
            setS(null);
          }}
        >
          {hasRates ? "Replace my rates" : "Use these"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setS(null)}>Discard</Button>
      </div>
    </div>
  );
}
