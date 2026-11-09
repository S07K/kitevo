"use client";

import { useEffect, useRef, useState } from "react";
import { Ban, Flag, MoreHorizontal, ShieldCheck } from "lucide-react";
import { Button } from "@/app/components/workspace/Button";
import { Modal } from "@/app/components/workspace/Modal";
import { MAX_REPORT_NOTE, REPORT_REASONS, type ReportReason } from "@/lib/safety-shared";

type Props = {
  userId: string;
  /** How the other account is named on screen (company name for brands). */
  name: string;
  /** Where this was opened from, kept with a report: "conversation:<id>", "deal:<id>", … */
  context: string;
  /** I've blocked them (from the server). */
  blockedByMe?: boolean;
  /** Called after block/unblock so the page can close or reopen what the block affects. */
  onBlockChange?: (blocked: boolean) => void;
  /** Visual: a "⋯" icon (default) or a small text link. */
  variant?: "icon" | "link";
};

/**
 * "⋯" → Block / Unblock and Report, for any place two accounts meet (messages, deals,
 * campaigns, applicants). Reports go to Kitevo admins; the reported account is never told who.
 */
export function SafetyMenu({ userId, name, context, blockedByMe = false, onBlockChange, variant = "icon" }: Props) {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<"block" | "report" | null>(null);
  const [blocked, setBlocked] = useState(blockedByMe);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [done, setDone] = useState<string | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => setBlocked(blockedByMe), [blockedByMe]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function openDialog(d: "block" | "report") {
    setOpen(false);
    setError(null);
    setDone(null);
    if (d === "report") {
      setReason(null);
      setNote("");
      setAlsoBlock(!blocked);
    }
    setDialog(d);
  }

  async function setBlock(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = next
        ? await fetch("/api/safety/block", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ userId }) })
        : await fetch(`/api/safety/block?userId=${encodeURIComponent(userId)}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error);
      setBlocked(next);
      onBlockChange?.(next);
      setDialog(null);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function sendReport() {
    if (!reason) return setError("Choose a reason.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/safety/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, reason, note, context, alsoBlock: alsoBlock && !blocked }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      if (data.blocked) {
        setBlocked(true);
        onBlockChange?.(true);
      }
      setDone(data.blocked ? `Thanks. Kitevo will review it, and you've blocked ${name}.` : "Thanks. Kitevo will review it.");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Couldn't send the report. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={wrap} className="relative shrink-0">
      {variant === "icon" ? (
        <button
          type="button"
          aria-label={`More options for ${name}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MoreHorizontal size={18} aria-hidden />
        </button>
      ) : (
        <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          Block or report
        </button>
      )}

      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-background py-1 shadow-lg">
          <button role="menuitem" type="button" onClick={() => (blocked ? setBlock(false) : openDialog("block"))} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-foreground hover:bg-muted">
            {blocked ? <ShieldCheck size={15} aria-hidden /> : <Ban size={15} aria-hidden />} {blocked ? `Unblock ${name}` : `Block ${name}`}
          </button>
          <button role="menuitem" type="button" onClick={() => openDialog("report")} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-red-600 hover:bg-muted dark:text-red-400">
            <Flag size={15} aria-hidden /> Report {name}
          </button>
        </div>
      )}

      <Modal
        open={dialog === "block"}
        onClose={() => setDialog(null)}
        dismissible={!busy}
        size="sm"
        title={`Block ${name}?`}
        description="They won't be told."
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
            <Button variant="danger" onClick={() => setBlock(true)} disabled={busy}>{busy ? "Blocking…" : "Block"}</Button>
          </div>
        }
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>Neither of you can message the other or start a conversation.</li>
          <li>No new campaign applications, deals or deal terms between you.</li>
          <li>You stop seeing each other in Discover and Campaigns.</li>
          <li>Anything already agreed can still be finished: payments, delivery or cancelling.</li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">You can unblock anytime in Settings.</p>
        {error && <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </Modal>

      <Modal
        open={dialog === "report"}
        onClose={() => setDialog(null)}
        dismissible={!busy}
        size="md"
        title={done ? "Report sent" : `Report ${name}`}
        description={done ? undefined : "Kitevo reviews every report. They won't know who reported them."}
        footer={
          done ? (
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setDialog(null)}>Done</Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button onClick={() => setDialog(null)} disabled={busy}>Cancel</Button>
              <Button variant="danger" onClick={sendReport} disabled={busy || !reason}>{busy ? "Sending…" : "Send report"}</Button>
            </div>
          )
        }
      >
        {done ? (
          <p className="text-sm text-foreground">{done}</p>
        ) : (
          <div className="space-y-4">
            <fieldset className="min-w-0 space-y-1.5">
              <legend className="mb-1.5 text-xs font-medium text-muted-foreground">What&apos;s wrong?</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${reason === r.id ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-foreground hover:border-primary/50"}`}>
                  <input type="radio" name="report-reason" value={r.id} checked={reason === r.id} onChange={() => setReason(r.id)} className="accent-[var(--primary)]" />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <div>
              <label htmlFor="report-note" className="mb-1.5 block text-xs font-medium text-muted-foreground">Anything else we should know? (optional)</label>
              <textarea
                id="report-note"
                rows={3}
                maxLength={MAX_REPORT_NOTE}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. asked me to pay a “registration fee” by UPI before the campaign"
                className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            {!blocked && (
              <label className="flex items-center gap-2.5 text-sm text-foreground">
                <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} className="accent-[var(--primary)]" />
                Also block {name}
              </label>
            )}
            {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Replaces a message composer once either side has blocked the other. */
export function BlockedNotice({ blockedBy, name, onUnblock }: { blockedBy: "me" | "them"; name: string; onUnblock?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      <span>{blockedBy === "me" ? `You blocked ${name}. Neither of you can send messages.` : "You can't reply to this conversation."}</span>
      {blockedBy === "me" && onUnblock && (
        <button type="button" onClick={onUnblock} className="text-xs font-semibold text-foreground underline underline-offset-2">Unblock</button>
      )}
    </div>
  );
}
