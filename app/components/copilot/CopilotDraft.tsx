"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { Button, ButtonLink } from "@/app/components/workspace/Button";
import type { CopilotTask } from "@/lib/copilot-prompts";

type Status =
  | { ok: true; source: "own"; providerName: string }
  | { ok: true; source: "kitevo"; remaining: number; limit: number }
  | { ok: false; reason: string; limit?: number };

type ErrorState = { message: string; code?: string };

const BLOCKED = new Set(["plan_required", "limit_reached", "not_configured", "ai_auth", "ai_model"]);

/**
 * "Draft with Copilot": asks /api/copilot for a draft and shows it for review. Nothing is
 * applied until the creator clicks the use button; they can try again or discard. The server
 * builds the prompt from the creator's own kit, so the client only says which task.
 */
export function CopilotDraft({
  task,
  params,
  onUse,
  label = "Draft with Copilot",
  useLabel = "Use this",
  className = "",
}: {
  task: CopilotTask;
  /** kitId / campaignId / inquiryId, as the task needs. */
  params?: Record<string, string | undefined>;
  onUse: (text: string) => void;
  label?: string;
  useLabel?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [copied, setCopied] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ task, ...params }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDraft(null);
        setError({ message: data.error ?? "Couldn't get a draft right now. Try again.", code: data.code });
        return;
      }
      setDraft(data.text);
      setStatus(data.status ?? null);
    } catch {
      setError({ message: "Couldn't reach Kitevo. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the text is still selectable */
    }
  }

  const usage =
    status?.ok && status.source === "own"
      ? `Using your ${status.providerName} key.`
      : status?.ok && status.source === "kitevo"
        ? `${status.remaining} of ${status.limit} drafts left this month.`
        : null;

  return (
    <div className={className}>
      {!draft && (
        <Button size="sm" variant="secondary" onClick={run} disabled={busy}>
          <Sparkles size={14} aria-hidden /> {busy ? "Drafting…" : label}
        </Button>
      )}

      {error && (
        <div role="alert" className="mt-2 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
          <p>{error.message}</p>
          {error.code && BLOCKED.has(error.code) && (
            <div className="mt-2 flex flex-wrap gap-2">
              <ButtonLink href="/connectors#ai" size="sm">{error.code === "ai_auth" || error.code === "ai_model" ? "Open Connectors" : "Connect an AI key"}</ButtonLink>
              {error.code === "plan_required" && <ButtonLink href="/pricing" size="sm" variant="ghost">See Pro</ButtonLink>}
            </div>
          )}
        </div>
      )}

      {draft && (
        <div className="rounded-xl border border-primary/25 bg-primary-soft/50 p-3" aria-live="polite">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary-soft-foreground">
            <Sparkles size={13} aria-hidden /> Copilot draft
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{draft}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                onUse(draft);
                setDraft(null);
              }}
            >
              {useLabel}
            </Button>
            <Button size="sm" onClick={run} disabled={busy}>{busy ? "Drafting…" : "Try again"}</Button>
            <Button size="sm" variant="ghost" onClick={copy} aria-label="Copy draft">
              {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />} {copied ? "Copied" : "Copy"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Discard</Button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Written from your kit. Read it before you send; Copilot can get things wrong.{usage ? ` ${usage}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
