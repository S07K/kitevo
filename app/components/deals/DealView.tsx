"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Check, CircleDollarSign, FileText, Handshake, PackageCheck, RotateCcw, X } from "lucide-react";
import { Badge } from "@/app/components/Badge";
import { Button } from "@/app/components/workspace/Button";
import { Modal } from "@/app/components/workspace/Modal";
import { BrandIcon } from "@/app/components/BrandIcon";
import { loadRazorpay, type RazorpayResponse } from "@/app/components/razorpay-client";
import { formatPrice } from "@/lib/commerce-shared";
import { allowedActions, planLabel, STATUS_LABEL, type DealRole, type DealStatus, type PaymentPlan } from "@/lib/deals-shared";
import type { PublicDeal } from "@/lib/deal-access";
import { EMPTY_QUOTE, QuoteForm, quotePayload, SubmitRow, type QuoteDraft } from "./QuoteForm";

export type DealData = PublicDeal & { payWith: ("razorpay" | "stripe" | "paypal")[] };

const PROVIDER_NAME = { razorpay: "Razorpay", stripe: "Stripe", paypal: "PayPal" } as const;
const STATUS_VARIANT: Record<DealStatus, "default" | "accent" | "success" | "warning" | "danger" | "open" | "closed"> = {
  proposed: "warning",
  accepted: "accent",
  delivered: "accent",
  completed: "success",
  declined: "closed",
  cancelled: "closed",
};
const KIND_LABEL = { full: "Payment", advance: "Advance", balance: "Balance" } as const;

const EVENT_TEXT: Record<string, (who: string, d: Record<string, string>) => string> = {
  proposed: (who, d) => `${who} proposed ${d.amount} (${d.plan})`,
  countered: (who, d) => `${who} countered with ${d.amount} (${d.plan})`,
  revised: (who, d) => `${who} proposed new terms: ${d.amount} (${d.plan})`,
  accepted: (who, d) => `${who} accepted ${d.amount}`,
  declined: (who) => `${who} declined the latest terms`,
  withdrawn: (who) => `${who} withdrew their terms`,
  cancelled: (who) => `${who} cancelled the deal`,
  payment_due: (_w, d) => `${d.amount} ${d.kind === "balance" ? "balance" : d.kind === "advance" ? "advance" : "payment"} is due`,
  paid: (_w, d) => `${d.amount} paid via ${PROVIDER_NAME[d.provider as keyof typeof PROVIDER_NAME] ?? d.provider}`,
  delivered: (who) => `${who} marked the work delivered`,
  completed: () => "Deal completed: delivered and paid in full",
};

const PAYMENT_NOTICE: Record<string, { tone: "success" | "danger" | "info"; text: string }> = {
  paid: { tone: "success", text: "Payment received. It went straight to the creator's account; your receipt is below." },
  cancelled: { tone: "info", text: "Payment cancelled. You weren't charged." },
  processing: { tone: "info", text: "Your payment is still processing. Refresh in a minute." },
  mismatch: { tone: "danger", text: "We couldn't match that payment. If you were charged, contact the creator with your receipt." },
  unavailable: { tone: "danger", text: "The creator's payment account isn't connected right now. If you were charged, contact them." },
};

function toDraft(v: DealData["versions"][number] | undefined): QuoteDraft {
  if (!v) return EMPTY_QUOTE;
  return {
    deliverables: (v.deliverables as { label: string; quantity: number }[]).map((d) => ({ ...d })),
    amount: String(v.amountCents / 100),
    currency: v.currency,
    paymentPlan: v.paymentPlan as PaymentPlan,
    advancePct: v.advancePct || 50,
    dueDate: v.dueDate ?? "",
    notes: v.notes,
  };
}

/**
 * One deal, seen by the creator, the brand's account or the brand's private link (token).
 * Both sides see the same terms, payments and history; buttons follow allowedActions.
 */
export function DealView({ initial, token, paymentNotice }: { initial: DealData; token?: string; paymentNotice?: string | null }) {
  const [deal, setDeal] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [counterOpen, setCounterOpen] = useState(false);
  const [draft, setDraft] = useState<QuoteDraft>(EMPTY_QUOTE);
  const [confirm, setConfirm] = useState<null | "cancel" | "decline" | "deliver" | "withdraw">(null);
  const [payProvider, setPayProvider] = useState<string>(initial.payWith[0] ?? "");
  const role = deal.role as DealRole;

  const open = deal.versions.find((v) => v.status === "open");
  const agreed = deal.versions.find((v) => v.status === "accepted");
  const current = open ?? agreed ?? deal.versions[0];
  const anyPaid = deal.payments.some((p) => p.status === "paid");
  const can = allowedActions({ role, status: deal.status as DealStatus, openBy: (open?.proposedBy as DealRole) ?? null, anyPaid });
  const other = role === "creator" ? deal.brandName : deal.creator.name;
  const nameOf = (actor: string) => (actor === role ? "You" : actor === "creator" ? deal.creator.name : actor === "brand" ? deal.brandName : "Kitevo");

  async function refresh() {
    const r = await fetch(`/api/deals/${deal.id}${token ? `?token=${encodeURIComponent(token)}` : ""}`, { credentials: "include", cache: "no-store" });
    if (r.ok) setDeal(await r.json());
  }
  useEffect(() => {
    if (paymentNotice === "paid") void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(action: string, quote?: QuoteDraft) {
    setBusy(action);
    setError(null);
    try {
      const r = await fetch(`/api/deals/${deal.id}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, token, quote: quote ? quotePayload(quote) : undefined }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return setError({ field: data.field, message: data.error ?? "That didn't work. Try again." });
      setDeal({ ...deal, ...data });
      setCounterOpen(false);
      setConfirm(null);
    } finally {
      setBusy(null);
    }
  }

  async function pay(paymentId: string) {
    setBusy(`pay-${paymentId}`);
    setError(null);
    try {
      const wantsRazorpay = payProvider === "razorpay";
      const [ready, r] = await Promise.all([
        wantsRazorpay ? loadRazorpay() : Promise.resolve(true),
        fetch(`/api/deal-payments/${paymentId}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ provider: payProvider, token }) }),
      ]);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return setError({ message: data.error ?? "Couldn't start the payment." });
      if (data.kind === "paid") return void refresh();
      if (data.kind === "redirect") return void window.location.assign(data.url);
      if (!ready || !window.Razorpay) return setError({ message: "Couldn't load Razorpay. Check your connection or turn off blockers for this page." });
      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amount,
        currency: data.currency,
        name: data.name,
        description: data.description,
        prefill: { email: data.email },
        handler: async (resp: RazorpayResponse) => {
          setBusy(`pay-${paymentId}`);
          const c = await fetch(`/api/deal-payments/${paymentId}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resp) });
          const cd = await c.json().catch(() => ({}));
          if (!c.ok) setError({ message: `${cd.error ?? "We couldn't confirm the payment."} Payment id: ${resp.razorpay_payment_id}` });
          await refresh();
          setBusy(null);
        },
        modal: { ondismiss: () => setBusy(null) },
      });
      rzp.on("payment.failed", (e) => setError({ message: e.error?.description ?? "The payment didn't go through. You weren't charged." }));
      rzp.open();
      return;
    } finally {
      if (payProvider !== "razorpay") setBusy(null);
    }
  }

  const notice = paymentNotice ? PAYMENT_NOTICE[paymentNotice] : null;
  const due = deal.payments.filter((p) => p.status === "due" || p.status === "pending");
  const paidTotal = deal.payments.filter((p) => p.status === "paid").reduce((a, p) => a + p.amountCents, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="min-w-0 space-y-6 lg:col-span-2 lg:col-start-1 lg:row-start-1">
        {notice && (
          <div
            role="status"
            className={`rounded-xl border p-4 text-sm ${
              notice.tone === "success"
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300"
                : notice.tone === "danger"
                  ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
                  : "border-border bg-muted/60 text-foreground"
            }`}
          >
            {notice.text}
          </div>
        )}

        {/* Terms */}
        <section className="rounded-2xl border border-border bg-background p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{open ? (open.proposedBy === role ? "Your terms, awaiting reply" : `Terms from ${other}`) : agreed ? "Agreed terms" : "Terms"}</h2>
            <Badge variant={STATUS_VARIANT[deal.status as DealStatus]} dot>{STATUS_LABEL[deal.status as DealStatus]}</Badge>
            {current && <span className="text-xs text-muted-foreground">Version {current.number} · proposed by {nameOf(current.proposedBy)}</span>}
          </div>
          {current && (
            <>
              <p className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground">{formatPrice(current.amountCents, current.currency)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{planLabel({ paymentPlan: current.paymentPlan as PaymentPlan, advancePct: current.advancePct })}{current.dueDate ? ` · due ${new Date(`${current.dueDate}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>
              {open && agreed && open.id !== agreed.id && (
                <p className="mt-2 text-xs text-muted-foreground">Currently agreed: {formatPrice(agreed.amountCents, agreed.currency)}. These new terms replace it only if accepted.</p>
              )}
              <ul className="mt-5 divide-y divide-border rounded-xl border border-border">
                {(current.deliverables as { label: string; quantity: number }[]).map((d, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 text-foreground">{d.label}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">× {d.quantity}</span>
                  </li>
                ))}
              </ul>
              {current.notes && <p className="mt-4 whitespace-pre-line rounded-xl bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">{current.notes}</p>}
            </>
          )}

          {error && !counterOpen && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error.message}</p>}
          {(can.accept || can.decline || can.propose || can.withdraw || can.markDelivered || can.cancel) && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
              {can.accept && (
                <Button variant="primary" onClick={() => act("accept")} disabled={!!busy}>
                  <Check size={15} aria-hidden /> {busy === "accept" ? "Accepting…" : "Accept terms"}
                </Button>
              )}
              {can.markDelivered && (
                <Button variant="primary" onClick={() => setConfirm("deliver")} disabled={!!busy}>
                  <PackageCheck size={15} aria-hidden /> Mark as delivered
                </Button>
              )}
              {can.propose && (
                <Button onClick={() => { setDraft(toDraft(current)); setError(null); setCounterOpen(true); }} disabled={!!busy}>
                  <RotateCcw size={15} aria-hidden /> {deal.status === "accepted" ? "Propose new terms" : "Counter"}
                </Button>
              )}
              {can.decline && <Button onClick={() => setConfirm("decline")} disabled={!!busy}>Decline</Button>}
              {can.withdraw && <Button variant="ghost" onClick={() => setConfirm("withdraw")} disabled={!!busy}>Withdraw</Button>}
              {can.cancel && <Button variant="ghost" onClick={() => setConfirm("cancel")} disabled={!!busy}>Cancel deal</Button>}
            </div>
          )}
        </section>
      </div>

      {/* Payments rail */}
      <aside className="min-w-0 space-y-6 lg:col-start-3 lg:row-span-2 lg:row-start-1">
        <section className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-center gap-2">
            <CircleDollarSign size={16} className="text-primary" aria-hidden />
            <h2 className="text-sm font-semibold text-foreground">Payments</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Paid straight into {deal.creator.name}&apos;s own account. Kitevo takes 0% and never holds the money.</p>
          {deal.payments.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Payments appear once the terms are agreed.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {deal.payments.map((p) => (
                <li key={p.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{KIND_LABEL[p.kind as keyof typeof KIND_LABEL]}</span>
                    <span className="text-base font-semibold tabular-nums text-foreground">{formatPrice(p.amountCents, p.currency)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.status === "paid"
                      ? `Paid ${p.paidAt ? new Date(p.paidAt).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : ""} via ${PROVIDER_NAME[p.provider as keyof typeof PROVIDER_NAME] ?? p.provider}`
                      : p.status === "scheduled"
                        ? "Due when the work is delivered"
                        : "Due now"}
                  </p>
                  {can.pay && (p.status === "due" || p.status === "pending") && deal.status !== "proposed" && (
                    <Button variant="primary" size="sm" className="mt-3 w-full" onClick={() => pay(p.id)} disabled={!!busy || !payProvider}>
                      {busy === `pay-${p.id}` ? "Opening payment…" : `Pay ${formatPrice(p.amountCents, p.currency)}`}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {role === "brand" && due.length > 0 && deal.payWith.length > 1 && (
            <fieldset className="mt-4 space-y-2">
              <legend className="mb-1 text-xs font-medium text-muted-foreground">Pay with</legend>
              {deal.payWith.map((p) => (
                <label key={p} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${payProvider === p ? "border-primary" : "border-border"}`}>
                  <input type="radio" name="pay-with" checked={payProvider === p} onChange={() => setPayProvider(p)} className="accent-[var(--primary)]" />
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white ring-1 ring-black/10"><BrandIcon brand={p} size={14} lightOnly /></span>
                  {PROVIDER_NAME[p]}
                </label>
              ))}
            </fieldset>
          )}
          {role === "brand" && due.length > 0 && deal.payWith.length === 0 && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              {deal.creator.name} hasn&apos;t connected a payment account for this currency yet. They&apos;ve been asked to; check back soon.
            </p>
          )}
          {role === "creator" && due.length > 0 && deal.payWith.length === 0 && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
              Connect Razorpay, Stripe or PayPal in <Link href="/connectors" className="font-medium underline">Connectors</Link> so {deal.brandName} can pay you.
            </p>
          )}
          {paidTotal > 0 && current && (
            <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
              Paid so far: <strong className="font-semibold text-foreground">{formatPrice(paidTotal, current.currency)}</strong>
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-background p-5 text-sm">
          <p className="flex items-center gap-2 font-medium text-foreground"><Handshake size={15} className="text-primary" aria-hidden /> Between</p>
          <p className="mt-2 text-muted-foreground">{deal.creator.name} <span className="text-xs">(creator)</span></p>
          <p className="text-muted-foreground">{deal.brandName} <span className="text-xs">(brand)</span></p>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays size={13} aria-hidden /> Started {new Date(deal.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>
          <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><FileText size={13} aria-hidden /> {deal.versions.length} version{deal.versions.length === 1 ? "" : "s"} of terms</p>
        </section>
      </aside>

      {/* History: after Payments on phones (paying comes first), under the terms on wide screens. */}
      <div className="min-w-0 lg:col-span-2 lg:col-start-1 lg:row-start-2">
        {/* Timeline */}
        <section className="rounded-2xl border border-border bg-background p-5 sm:p-6">
          <h2 className="text-sm font-semibold text-foreground">History</h2>
          <p className="mt-1 text-xs text-muted-foreground">Both of you see this same record. It can&apos;t be edited.</p>
          <ol className="mt-4 space-y-3">
            {[...deal.events].reverse().map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                <span className="min-w-0 flex-1 text-foreground">{(EVENT_TEXT[e.type] ?? (() => e.type))(nameOf(e.actor), (e.data ?? {}) as Record<string, string>)}</span>
                <time className="shrink-0 text-xs tabular-nums text-muted-foreground" dateTime={String(e.createdAt)}>
                  {new Date(e.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </time>
              </li>
            ))}
          </ol>
        </section>
      </div>


      <Modal
        open={counterOpen}
        onClose={() => setCounterOpen(false)}
        dismissible={!busy}
        size="lg"
        title={deal.status === "accepted" ? "Propose new terms" : "Counter with new terms"}
        description={`${other} has to accept these before they replace the current terms.`}
        footer={<div className="flex justify-end gap-2"><Button onClick={() => setCounterOpen(false)} disabled={!!busy}>Cancel</Button><Button variant="primary" onClick={() => act("propose", draft)} disabled={!!busy}>{busy === "propose" ? "Sending…" : "Send terms"}</Button></div>}
      >
        <QuoteForm value={draft} onChange={setDraft} error={error} />
        {error && !error.field && <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">{error.message}</p>}
      </Modal>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        dismissible={!busy}
        title={confirm === "deliver" ? "Mark the work as delivered?" : confirm === "decline" ? "Decline these terms?" : confirm === "withdraw" ? "Withdraw your terms?" : "Cancel this deal?"}
        description={
          confirm === "deliver"
            ? `${deal.brandName} is told, and any payment due on delivery becomes payable.`
            : confirm === "decline"
              ? agreed ? "The terms you already agreed stay in place." : "The deal ends. You can start a new one later."
              : confirm === "withdraw"
                ? agreed ? "The terms you already agreed stay in place." : "The deal ends."
                : "Both sides are told. This can't be undone."
        }
      >
        <div className="flex justify-end gap-2">
          <Button onClick={() => setConfirm(null)} disabled={!!busy}>Keep it</Button>
          <Button variant={confirm === "deliver" ? "primary" : "danger"} onClick={() => act(confirm === "deliver" ? "deliver" : confirm!)} disabled={!!busy}>
            {confirm === "deliver" ? <><PackageCheck size={15} aria-hidden /> Mark delivered</> : confirm === "decline" ? <><X size={15} aria-hidden /> Decline</> : confirm === "withdraw" ? "Withdraw" : "Cancel deal"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export { SubmitRow };
