"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Handshake, Plus } from "lucide-react";
import { WorkspaceShell, PageHeader } from "@/app/components/workspace/WorkspaceShell";
import { ButtonLink } from "@/app/components/workspace/Button";
import { Badge } from "@/app/components/Badge";
import { ListCardSkeleton } from "@/app/components/Skeleton";
import { formatPrice } from "@/lib/commerce-shared";
import { STATUS_LABEL, type DealStatus } from "@/lib/deals-shared";

type Row = { id: string; title: string; status: DealStatus; role: "creator" | "brand"; counterpart: string; amountCents: number; currency: string; awaiting: "creator" | "brand" | null; paidCents: number; dueCents: number; updatedAt: string };

export function DealsList({ isBrand }: { isBrand: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/api/deals", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setRows)
      .catch(() => setError(true));
  }, []);

  const yourTurn = (r: Row) => (r.awaiting === r.role) || (r.role === "brand" && r.dueCents > 0);
  return (
    <WorkspaceShell width="wide">
      <PageHeader
        eyebrow={isBrand ? "Partnerships" : "Social"}
        title="Deals"
        description={isBrand ? "Offers, agreed terms and payments with creators. You pay creators directly; Kitevo takes 0%." : "Quotes, agreed terms and payments with brands, in one record you both see. Brands pay you directly; Kitevo takes 0%."}
        actions={!isBrand ? <ButtonLink href="/deals/new" variant="primary"><Plus size={15} aria-hidden /> New deal</ButtonLink> : undefined}
      />
      {error ? (
        <p className="text-sm text-red-600">Couldn&apos;t load your deals. Refresh to try again.</p>
      ) : rows === null ? (
        <div className="space-y-3"><ListCardSkeleton /><ListCardSkeleton /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
          <Handshake size={22} className="mx-auto text-muted-foreground" aria-hidden />
          <p className="mt-3 font-display text-lg font-semibold text-foreground">No deals yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {isBrand
              ? "Send an offer from a creator's application to your campaign or from a message thread."
              : "Send a quote from an accepted campaign, a message thread, a kit inquiry in Pipeline, or start one here."}
          </p>
          {!isBrand && <ButtonLink href="/deals/new" variant="primary" className="mt-5"><Plus size={15} aria-hidden /> New deal</ButtonLink>}
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/deals/${r.id}`} className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-foreground">{r.title}</p>
                    <Badge variant={r.status === "completed" ? "success" : r.status === "proposed" ? "warning" : r.status === "declined" || r.status === "cancelled" ? "closed" : "accent"} dot>{STATUS_LABEL[r.status]}</Badge>
                    {yourTurn(r) && <Badge variant="accent">Your turn</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.counterpart} · updated {new Date(r.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-semibold tabular-nums text-foreground">{formatPrice(r.amountCents, r.currency)}</p>
                  <p className="text-xs text-muted-foreground">{r.paidCents > 0 ? `${formatPrice(r.paidCents, r.currency)} paid` : r.dueCents > 0 ? `${formatPrice(r.dueCents, r.currency)} due` : "Nothing paid yet"}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WorkspaceShell>
  );
}
