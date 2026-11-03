"use client";

import { useState } from "react";
import { Button } from "@/app/components/workspace/Button";
import { Modal } from "@/app/components/workspace/Modal";

export type Connection = { provider: string; keyHint: string; livemode: boolean };

const field =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";

/** Paste-your-keys dialog for the creator's own Razorpay account (creator-owned payments). */
export function ConnectRazorpayDialog({ open, onClose, onConnected }: { open: boolean; onClose: () => void; onConnected: (c: Connection) => void }) {
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider: "razorpay", keyId, keySecret }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError({ field: data.field, message: data.error ?? "Couldn't connect. Try again." });
      setKeyId("");
      setKeySecret("");
      onConnected(data);
    } catch {
      setError({ message: "Couldn't reach the server. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const err = (f: string) => (error?.field === f ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error.message}</p> : null);
  return (
    <Modal open={open} onClose={onClose} dismissible={!busy} size="md" title="Connect Razorpay" description="Buyers pay you directly. Kitevo never sees card details or holds your money.">
      <ol className="mb-5 space-y-1.5 rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
        <li>1. In your Razorpay Dashboard, open <strong className="font-medium text-foreground">Account &amp; Settings → API Keys</strong>.</li>
        <li>2. Generate a key (or regenerate one) and copy the <strong className="font-medium text-foreground">Key ID</strong> and <strong className="font-medium text-foreground">Key Secret</strong>.</li>
        <li>3. Paste both here. Use test keys to try it out first, then switch to live keys.</li>
      </ol>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="rp-key" className="mb-1.5 block text-xs font-medium text-muted-foreground">Key ID</label>
          <input id="rp-key" value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="rzp_live_…" autoComplete="off" spellCheck={false} className={field} />
          {err("keyId")}
        </div>
        <div>
          <label htmlFor="rp-secret" className="mb-1.5 block text-xs font-medium text-muted-foreground">Key Secret</label>
          <input id="rp-secret" type="password" value={keySecret} onChange={(e) => setKeySecret(e.target.value)} autoComplete="off" spellCheck={false} className={field} />
          {err("keySecret")}
          <p className="mt-1 text-xs text-muted-foreground">Stored encrypted. Only used to create payments and confirm them.</p>
        </div>
        {error && !error.field && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy || !keyId.trim() || !keySecret.trim()}>{busy ? "Checking keys…" : "Connect"}</Button>
        </div>
      </form>
    </Modal>
  );
}
