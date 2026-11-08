"use client";

import { useState } from "react";
import { Button } from "@/app/components/workspace/Button";
import { Modal } from "@/app/components/workspace/Modal";
import { SCHEDULER_INFO, type Scheduler } from "@/lib/scheduler-links";

export type SchedulerConnection = { provider: Scheduler; url: string };

const field =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";

/** Paste your scheduling page link (public; no keys). Google short links are resolved server-side. */
export function ConnectSchedulerDialog({ provider, onClose, onConnected }: { provider: Scheduler | null; onClose: () => void; onConnected: (c: SchedulerConnection) => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const info = provider ? SCHEDULER_INFO[provider] : null;

  async function save() {
    if (!provider) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/scheduling/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider, url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Couldn't connect. Try again.");
      setUrl("");
      onConnected(data);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!provider}
      onClose={onClose}
      dismissible={!busy}
      size="md"
      title={`Connect ${info?.name ?? ""}`}
      description="People book on your own scheduling page, opened from the Book a call button on your kit. Your availability, calendar conflicts and reminders stay in the scheduler."
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="connect-scheduler" variant="primary" disabled={busy || !url.trim()}>{busy ? "Checking link…" : "Connect"}</Button>
        </div>
      }
    >
      <p className="mb-4 rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">{info?.where}</p>
      <form
        id="connect-scheduler"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label htmlFor="sched-url" className="mb-1.5 block text-xs font-medium text-muted-foreground">Your scheduling link</label>
        <input id="sched-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={info?.example} autoComplete="off" spellCheck={false} className={field} />
        <p className="mt-1 text-xs text-muted-foreground">Each kit can use a different event from the same account (set it in the kit editor&apos;s Contact card).</p>
        {error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </Modal>
  );
}
