"use client";

import { useState } from "react";
import Link from "next/link";

type Props = {
  campaignId: string;
  initialStatus: string | null;
  appliedAt: string | null;
  reviewedAt: string | null;
  hasConversation: boolean;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type Step = {
  key: string;
  label: string;
  sublabel?: string;
  date?: string;
  state: "done" | "active" | "pending";
  variant?: "success" | "danger" | "warning";
};

function buildSteps(
  status: string | null,
  appliedAt: string | null,
  reviewedAt: string | null,
  hasConversation: boolean,
): Step[] {
  if (!status) return [];

  const isReviewed = status !== "pending" || hasConversation;
  const isDecided = status === "accepted" || status === "rejected";

  const steps: Step[] = [
    {
      key: "applied",
      label: "Application submitted",
      sublabel: "Your pitch is on the brand's radar.",
      date: appliedAt ?? undefined,
      state: "done",
    },
    {
      key: "review",
      label: "Under review",
      sublabel: isReviewed ? "The brand has seen your application." : "Waiting for the brand to review.",
      date: isReviewed && reviewedAt ? reviewedAt : undefined,
      state: isReviewed ? "done" : "active",
    },
  ];

  if (hasConversation) {
    steps.push({
      key: "reached",
      label: "Brand reached out",
      sublabel: "You have a message from the brand.",
      state: "done",
    });
  }

  if (isDecided) {
    steps.push({
      key: "decision",
      label: status === "accepted" ? "Application accepted" : "Not shortlisted",
      sublabel:
        status === "accepted"
          ? "Congrats! Check your inbox — the brand may reach out."
          : "This one wasn't a fit. Keep applying to other campaigns.",
      date: reviewedAt ?? undefined,
      state: "done",
      variant: status === "accepted" ? "success" : "danger",
    });
  } else {
    steps.push({
      key: "decision",
      label: "Decision pending",
      sublabel: "The brand will accept or decline your application.",
      state: isReviewed ? "active" : "pending",
      variant: "warning",
    });
  }

  return steps;
}

const dotColors: Record<string, string> = {
  done_success: "bg-green-500",
  done_danger:  "bg-red-500",
  done_warning: "bg-amber-500",
  done:         "bg-foreground",
  active:       "bg-blue-500 ring-4 ring-blue-500/20",
  pending:      "bg-border",
};

const labelColors: Record<string, string> = {
  success: "text-green-600 dark:text-green-400",
  danger:  "text-red-500 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
};

export function ApplySection({ campaignId, initialStatus, appliedAt, reviewedAt, hasConversation }: Props) {
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [localAppliedAt, setLocalAppliedAt] = useState<string | null>(appliedAt);
  const [showForm, setShowForm] = useState(false);
  const [pitch, setPitch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/social/campaigns/${campaignId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: pitch }),
        credentials: "include",
      });
      if (res.ok) {
        setStatus("pending");
        setLocalAppliedAt(new Date().toISOString());
        setShowForm(false);
        setPitch("");
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to submit. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Timeline view — shown once applied
  if (status) {
    const steps = buildSteps(status, localAppliedAt, reviewedAt, hasConversation);
    const lastStep = steps[steps.length - 1];
    const isAccepted = status === "accepted";

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Application timeline
          </h2>

          <div className="relative space-y-0">
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              const dotKey = step.state === "done"
                ? `done_${step.variant ?? ""}`
                : step.state;
              const dotClass = dotColors[dotKey] || dotColors[step.state];

              return (
                <div key={step.key} className="flex gap-4">
                  {/* Column: dot + line */}
                  <div className="flex flex-col items-center">
                    <div className={`h-3 w-3 rounded-full shrink-0 mt-1 transition-all ${dotClass}`} />
                    {!isLast && <div className="w-px flex-1 bg-border mt-1.5 mb-1.5 min-h-[28px]" />}
                  </div>

                  {/* Content */}
                  <div className={`pb-5 min-w-0 ${isLast ? "pb-0" : ""}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${
                        step.variant && step.state === "done"
                          ? labelColors[step.variant]
                          : step.state === "active"
                          ? "text-blue-600 dark:text-blue-400"
                          : step.state === "pending"
                          ? "text-muted-foreground"
                          : "text-foreground"
                      }`}>
                        {step.label}
                      </p>
                      {step.date && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {fmt(step.date)}
                        </span>
                      )}
                    </div>
                    {step.sublabel && (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.sublabel}</p>
                    )}
                    {step.key === "reached" && (
                      <Link
                        href="/social/inbox"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
                      >
                        Open inbox
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </Link>
                    )}
                    {step.key === "decision" && isAccepted && (
                      <Link
                        href="/social/inbox"
                        className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline mt-1"
                      >
                        Check inbox
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Pitch form
  if (showForm) {
    return (
      <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-0.5">Your pitch</h2>
          <p className="text-xs text-muted-foreground">Tell the brand why you're a great fit. Keep it real and specific.</p>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          placeholder="Tell the brand why you're a great fit — your niche, audience, past work…"
          rows={5}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !pitch.trim()}
            className="h-10 px-6 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit application"}
          </button>
          <button
            type="button"
            onClick={() => { setShowForm(false); setPitch(""); setError(null); }}
            className="h-10 px-4 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="h-11 px-8 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity"
      >
        Apply to this campaign
      </button>
      <p className="text-xs text-muted-foreground">Free · No commitments</p>
    </div>
  );
}
