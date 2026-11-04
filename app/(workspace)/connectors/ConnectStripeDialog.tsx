"use client";

import { useState } from "react";
import { Button } from "@/app/components/workspace/Button";
import { Modal } from "@/app/components/workspace/Modal";
import type { Connection } from "./ConnectRazorpayDialog";

const field =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";

/**
 * Paste-your-key dialog for the creator's own Stripe account. Restricted keys only, with just
 * "Checkout Sessions: Write", so Kitevo can create checkouts and nothing else.
 */
export function ConnectStripeDialog({ open, onClose, onConnected }: { open: boolean; onClose: () => void; onConnected: (c: Connection) => void }) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider: "stripe", key }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Couldn't connect. Try again.");
      setKey("");
      onConnected(data);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!busy}
      size="md"
      title="Connect Stripe"
      description="Buyers pay you on Stripe's own checkout page. Kitevo never sees card details or holds your money."
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="connect-stripe" variant="primary" disabled={busy || !key.trim()}>{busy ? "Checking key…" : "Connect"}</Button>
        </div>
      }
    >
      <ol className="mb-5 space-y-1.5 rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
        <li>1. In your Stripe Dashboard, open <strong className="font-medium text-foreground">Developers → API keys</strong>.</li>
        <li>2. Choose <strong className="font-medium text-foreground">Create restricted key</strong>, name it “Kitevo”.</li>
        <li>3. Set <strong className="font-medium text-foreground">Checkout Sessions</strong> to <strong className="font-medium text-foreground">Write</strong>. Leave everything else as None.</li>
        <li>4. Create the key, copy it (it starts with <span className="font-mono">rk_</span>) and paste it here. Use a test-mode key to try it first.</li>
      </ol>
      <form
        id="connect-stripe"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label htmlFor="stripe-key" className="mb-1.5 block text-xs font-medium text-muted-foreground">Restricted key</label>
        <input id="stripe-key" type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="rk_live_…" autoComplete="off" spellCheck={false} className={field} />
        <p className="mt-1 text-xs text-muted-foreground">Stored encrypted. It can only create checkouts and read their status.</p>
        {error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </Modal>
  );
}
