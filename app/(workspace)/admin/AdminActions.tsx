"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** POSTs to an admin endpoint, then refreshes the server page so tables reflect the change. */
function useAdminPost() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function post(url: string, body?: unknown, describe?: (json: Record<string, unknown>) => string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok || json.ok === false) {
        setMessage({ ok: false, text: String(json.error ?? `Failed (${res.status})`) });
      } else {
        setMessage({ ok: true, text: describe ? describe(json) : "Done" });
        router.refresh();
      }
    } catch {
      setMessage({ ok: false, text: "Network error" });
    } finally {
      setBusy(false);
    }
  }
  return { busy, message, post };
}

function Feedback({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <span role="status" className={`text-xs ${message.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
      {message.text}
    </span>
  );
}

const btn =
  "inline-flex h-8 items-center rounded-full border border-border px-3 text-xs font-semibold transition-colors hover:bg-muted disabled:opacity-50";

export function ReplayButton({ id }: { id: string }) {
  const { busy, message, post } = useAdminPost();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        className={btn}
        disabled={busy}
        onClick={() => {
          if (confirm("Re-apply this event exactly as received? For plan state, Resync on the user is safer.")) {
            post(`/api/admin/webhooks/${id}/replay`, undefined, (j) => `Replayed: ${j.status}`);
          }
        }}
      >
        {busy ? "Replaying…" : "Replay"}
      </button>
      <Feedback message={message} />
    </span>
  );
}

export function PlanControls({
  userId,
  compedTier,
  tiers,
  hasCustomer,
}: {
  userId: string;
  compedTier: string | null;
  tiers: Array<{ id: string; name: string }>;
  hasCustomer: boolean;
}) {
  const [tier, setTier] = useState(compedTier ?? "");
  const { busy, message, post } = useAdminPost();
  const changed = (tier || null) !== compedTier;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="comp-tier" className="text-sm font-medium">
          Comped tier
        </label>
        <select
          id="comp-tier"
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
        >
          <option value="">None</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={btn}
          disabled={busy || !changed}
          onClick={() =>
            post(`/api/admin/users/${userId}/comp`, { tier: tier || null }, (j) => `Saved · badge ${j.verifiedTier ?? "none"}`)
          }
        >
          Save comp
        </button>
        <button
          type="button"
          className={btn}
          disabled={busy}
          title={hasCustomer ? "Ask the payment provider for the live subscription and re-derive the badge" : "No customer id: re-derives from the comp only"}
          onClick={() =>
            post(`/api/admin/users/${userId}/resync`, undefined, (j) =>
              `Resynced · ${j.subscriptionStatus ?? "no subscription"} · badge ${j.verifiedTier ?? "none"}`
            )
          }
        >
          Resync from provider
        </button>
      </div>
      <Feedback message={message} />
    </div>
  );
}

/** Dismiss a report, or suspend the reported account (closes all their open reports). */
export function ReportActions({ id, name }: { id: string; name: string }) {
  const { busy, message, post } = useAdminPost();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className={btn} disabled={busy} onClick={() => post(`/api/admin/reports/${id}`, { action: "dismiss" }, () => "Dismissed")}>
        Dismiss
      </button>
      <button
        type="button"
        className={`${btn} border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40`}
        disabled={busy}
        onClick={() => {
          if (confirm(`Suspend ${name}? They can't sign in, and their kit, profile and campaigns are hidden. You can undo this on their user page.`)) {
            post(`/api/admin/reports/${id}`, { action: "suspend" }, (j) => `Suspended · ${j.reportsClosed} report${j.reportsClosed === 1 ? "" : "s"} closed`);
          }
        }}
      >
        Suspend account
      </button>
      <Feedback message={message} />
    </span>
  );
}

/** On the user page: suspend or lift a suspension. */
export function SuspendControls({ userId, suspended }: { userId: string; suspended: boolean }) {
  const { busy, message, post } = useAdminPost();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={btn}
        disabled={busy}
        onClick={() => {
          if (confirm(suspended ? "Lift the suspension? They can sign in again and their public pages come back." : "Suspend this account? They can't sign in, and their kit, profile and campaigns are hidden.")) {
            post(`/api/admin/users/${userId}/suspend`, { suspended: !suspended }, (j) => (j.suspended ? "Suspended" : "Suspension lifted"));
          }
        }}
      >
        {suspended ? "Lift suspension" : "Suspend account"}
      </button>
      <Feedback message={message} />
    </span>
  );
}
