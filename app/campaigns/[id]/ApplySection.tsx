"use client";

import { useState } from "react";

type Props = {
  campaignId: string;
  initialStatus: string | null; // null = not applied
};

export function ApplySection({ campaignId, initialStatus }: Props) {
  const [status, setStatus] = useState<string | null>(initialStatus);
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

  if (status) {
    return (
      <div className={`rounded-2xl border p-5 ${
        status === "accepted"
          ? "border-green-300 bg-green-50 dark:bg-green-950/20"
          : status === "rejected"
          ? "border-red-200 bg-red-50 dark:bg-red-950/20"
          : "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20"
      }`}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${
            status === "accepted" ? "bg-green-500" :
            status === "rejected" ? "bg-red-500" : "bg-yellow-500"
          }`} />
          <p className="text-sm font-semibold text-foreground capitalize">Application {status}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {status === "accepted"
            ? "Congrats! Check your inbox — the brand may reach out."
            : status === "rejected"
            ? "This one wasn't a fit. Keep applying to other campaigns."
            : "Your application is under review. The brand will respond soon."}
        </p>
      </div>
    );
  }

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
