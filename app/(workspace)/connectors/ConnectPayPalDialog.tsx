"use client";

import { useState } from "react";
import { Button } from "@/app/components/workspace/Button";
import { Modal } from "@/app/components/workspace/Modal";
import type { Connection } from "./ConnectRazorpayDialog";

const field =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";

/** Paste the Client ID + Secret of the creator's own PayPal REST app (live or sandbox, detected). */
export function ConnectPayPalDialog({ open, onClose, onConnected }: { open: boolean; onClose: () => void; onConnected: (c: Connection) => void }) {
  const [clientId, setClientId] = useState("");
  const [secret, setSecret] = useState("");
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
        body: JSON.stringify({ provider: "paypal", clientId, secret }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Couldn't connect. Try again.");
      setClientId("");
      setSecret("");
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
      title="Connect PayPal"
      description="Buyers pay you on PayPal's own page. Kitevo never sees their PayPal login or card details, or holds your money."
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="connect-paypal" variant="primary" disabled={busy || !clientId.trim() || !secret.trim()}>{busy ? "Checking…" : "Connect"}</Button>
        </div>
      }
    >
      <ol className="mb-5 space-y-1.5 rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
        <li>1. Sign in at <strong className="font-medium text-foreground">developer.paypal.com</strong> with your PayPal business account.</li>
        <li>2. Open <strong className="font-medium text-foreground">Apps &amp; Credentials</strong> and create an app (name it “Kitevo”).</li>
        <li>3. Copy its <strong className="font-medium text-foreground">Client ID</strong> and <strong className="font-medium text-foreground">Secret</strong> and paste them here. Use the Sandbox tab to try it first, then Live.</li>
      </ol>
      <form
        id="connect-paypal"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="pp-id" className="mb-1.5 block text-xs font-medium text-muted-foreground">Client ID</label>
          <input id="pp-id" value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="off" spellCheck={false} className={field} />
        </div>
        <div>
          <label htmlFor="pp-secret" className="mb-1.5 block text-xs font-medium text-muted-foreground">Secret</label>
          <input id="pp-secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} autoComplete="off" spellCheck={false} className={field} />
          <p className="mt-1 text-xs text-muted-foreground">Stored encrypted. Only used to create and confirm payments. PayPal is offered for USD products (it doesn&apos;t take INR).</p>
        </div>
        {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </Modal>
  );
}
