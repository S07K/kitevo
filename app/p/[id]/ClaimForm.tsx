"use client";

import { useState } from "react";

/** Email capture for a free download. Shows the delivery link right away and emails it too. */
export function ClaimForm({ productId, creatorName, preview }: { productId: string; creatorName: string; preview?: boolean }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<{ phase: "idle" | "sending" | "done" | "error"; accessUrl?: string; error?: string }>({ phase: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview) return;
    setState({ phase: "sending" });
    try {
      const res = await fetch(`/api/products/${productId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setState({ phase: "error", error: data.error ?? "That didn't go through. Try again." });
      setState({ phase: "done", accessUrl: data.accessUrl });
    } catch {
      setState({ phase: "error", error: "Couldn't connect. Check your connection and try again." });
    }
  }

  const input =
    "w-full rounded-xl border border-[var(--mk-border)] bg-[var(--mk-bg)] px-4 py-3 font-sans text-sm text-[var(--mk-text)] placeholder:text-[var(--mk-text-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--mk-text)]/30";

  if (state.phase === "done") {
    return (
      <div className="rounded-2xl bg-[var(--mk-surface)] p-6 text-center">
        <p className="font-display text-xl font-semibold text-[var(--mk-text)]">It&apos;s yours</p>
        <p className="mt-1 font-sans text-sm text-[var(--mk-text-muted)]">We&apos;ve also emailed the link to {email}, so you can come back to it.</p>
        <a
          href={state.accessUrl}
          className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-[var(--mk-text)] px-7 font-sans text-sm font-semibold text-[var(--mk-bg)] transition-opacity hover:opacity-90"
        >
          Open your download
        </a>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-[var(--mk-surface)] p-5 sm:p-6">
      <input aria-label="Your name" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} className={input} />
      <input aria-label="Your email" type="email" required placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
      {state.phase === "error" && <p role="alert" className="font-sans text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={state.phase === "sending" || preview}
        className="h-12 w-full rounded-full bg-[var(--mk-text)] font-sans text-sm font-semibold text-[var(--mk-bg)] transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {preview ? "Get it free (preview)" : state.phase === "sending" ? "Sending…" : "Get it free"}
      </button>
      <p className="text-center font-sans text-[11px] leading-relaxed text-[var(--mk-text-soft)]">
        {creatorName} will see your name and email and may contact you about their work.
      </p>
    </form>
  );
}
