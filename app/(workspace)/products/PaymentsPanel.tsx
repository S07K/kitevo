"use client";

import { useState } from "react";
import { Panel } from "@/app/components/workspace/WorkspaceShell";
import { Button } from "@/app/components/workspace/Button";
import { Modal } from "@/app/components/workspace/Modal";
import { Badge } from "@/app/components/Badge";
import { BrandChip } from "@/app/components/BrandChip";

export type Connection = { provider: string; keyHint: string; livemode: boolean };

const field =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";

/**
 * Where creators connect their own payment account (creator-owned payments: buyers pay the
 * creator directly; Kitevo never holds the money). Razorpay today; Stripe and PayPal later.
 */
export function PaymentsPanel({ connection, onChange }: { connection: Connection | null | undefined; onChange: (c: Connection | null) => void }) {
  const [open, setOpen] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    setBusy(true);
    const res = await fetch("/api/payments/connections?provider=razorpay", { method: "DELETE", credentials: "include" });
    setBusy(false);
    if (res.ok) {
      onChange(null);
      setConfirmOff(false);
    }
  }

  return (
    <Panel title="Payments">
      {connection === undefined ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : connection ? (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <BrandChip brand="razorpay" size={15} />
            <Badge variant="success" dot>Connected</Badge>
            {!connection.livemode && <Badge variant="warning">Test mode</Badge>}
          </div>
          <p className="mt-2 font-mono text-xs text-muted-foreground">{connection.keyHint}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Paid products are paid straight into your Razorpay account. Kitevo never holds your money and takes 0%.
          </p>
          {!connection.livemode && (
            <p className="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
              Test keys only accept Razorpay&apos;s test cards. Connect your live keys before you start selling.
            </p>
          )}
          {confirmOff ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="w-full text-xs text-muted-foreground">Your paid products stop selling until you connect again.</p>
              <Button size="sm" onClick={() => setConfirmOff(false)} disabled={busy}>Keep connected</Button>
              <Button size="sm" variant="danger" onClick={disconnect} disabled={busy}>{busy ? "Disconnecting…" : "Disconnect"}</Button>
            </div>
          ) : (
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-muted-foreground hover:text-foreground">Update keys</button>
              <button type="button" onClick={() => setConfirmOff(true)} className="text-xs font-medium text-muted-foreground hover:text-red-600 dark:hover:text-red-400">Disconnect</button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Sell products for a price, paid straight into your own <BrandChip brand="razorpay" /> account. Kitevo never holds your money
            and takes 0%. Included in Starter and Pro.
          </p>
          <Button variant="primary" size="sm" className="mt-4" onClick={() => setOpen(true)}>Connect Razorpay</Button>
          <p className="mt-3 text-xs text-muted-foreground">
            <BrandChip brand="stripe" size={11} /> and <BrandChip brand="paypal" size={11} /> are coming soon.
          </p>
        </div>
      )}
      <ConnectRazorpayDialog
        open={open}
        onClose={() => setOpen(false)}
        onConnected={(c) => {
          onChange(c);
          setOpen(false);
        }}
      />
    </Panel>
  );
}

function ConnectRazorpayDialog({ open, onClose, onConnected }: { open: boolean; onClose: () => void; onConnected: (c: Connection) => void }) {
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
