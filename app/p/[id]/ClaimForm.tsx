"use client";

import { useState } from "react";

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

/** Loads Razorpay's official checkout script once (https://checkout.razorpay.com/v1/checkout.js). */
function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(!!window.Razorpay);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/**
 * The buy box on a product page. Free: email → private download page (and email).
 * Paid: email → Razorpay Checkout on the CREATOR's account → server verifies → download page.
 */
export function ClaimForm({
  productId,
  creatorName,
  preview,
  priceLabel,
}: {
  productId: string;
  creatorName: string;
  preview?: boolean;
  /** e.g. "₹499" for a paid product; omitted for free downloads. */
  priceLabel?: string;
}) {
  const paid = !!priceLabel;
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<{ phase: "idle" | "sending" | "done" | "error"; accessUrl?: string; error?: string }>({ phase: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview) return;
    if (paid) return buy();
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

  async function buy() {
    setState({ phase: "sending" });
    try {
      const [ready, res] = await Promise.all([
        loadRazorpay(),
        fetch(`/api/products/${productId}/checkout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name }) }),
      ]);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setState({ phase: "error", error: data.error ?? "Couldn't start the payment. Try again." });
      if (data.alreadyPaid) return setState({ phase: "done", accessUrl: data.accessUrl });
      if (!ready || !window.Razorpay) return setState({ phase: "error", error: "Couldn't load the payment window. Check your connection or turn off blockers for this page." });

      const rzp = new window.Razorpay({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amount,
        currency: data.currency,
        name: data.sellerName,
        description: data.productTitle,
        prefill: data.prefill,
        handler: async (r: RazorpayResponse) => {
          setState({ phase: "sending" });
          // Retry a few times: the payment is done, only our confirmation call might be slow.
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const c = await fetch(`/api/orders/${data.orderId}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) });
              const cd = await c.json().catch(() => ({}));
              if (c.ok) return setState({ phase: "done", accessUrl: cd.accessUrl });
              if (c.status < 500) return setState({ phase: "error", error: `${cd.error ?? "We couldn't confirm the payment."} Payment id: ${r.razorpay_payment_id}` });
            } catch {
              /* network: retry */
            }
            await new Promise((ok) => setTimeout(ok, 1500 * (attempt + 1)));
          }
          setState({ phase: "error", error: `Your payment went through but we couldn't confirm it yet. Refresh in a minute or contact ${creatorName} with payment id ${r.razorpay_payment_id}.` });
        },
        modal: { ondismiss: () => setState({ phase: "idle" }) },
      });
      rzp.on("payment.failed", (resp) => setState({ phase: "error", error: resp.error?.description ?? "The payment didn't go through. You weren't charged." }));
      rzp.open();
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
        <p className="mt-1 font-sans text-sm text-[var(--mk-text-muted)]">
          {paid ? "Payment received. " : ""}We&apos;ve also emailed the link to {email}, so you can come back to it.
        </p>
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
        {preview
          ? `${paid ? `Buy for ${priceLabel}` : "Get it free"} (preview)`
          : state.phase === "sending"
            ? paid ? "Opening payment…" : "Sending…"
            : paid ? `Buy for ${priceLabel}` : "Get it free"}
      </button>
      <p className="text-center font-sans text-[11px] leading-relaxed text-[var(--mk-text-soft)]">
        {paid
          ? `You pay ${creatorName} directly through Razorpay. ${creatorName} will see your name and email.`
          : `${creatorName} will see your name and email and may contact you about their work.`}
      </p>
    </form>
  );
}
