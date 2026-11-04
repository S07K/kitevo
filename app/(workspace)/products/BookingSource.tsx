"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandIcon } from "@/app/components/BrandIcon";
import { ButtonLink } from "@/app/components/workspace/Button";
import { SCHEDULER_INFO, parseSchedulerUrl, type Scheduler } from "@/lib/scheduler-links";
import type { SchedulerConnection } from "../connectors/ConnectSchedulerDialog";

const field =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";

/** "Calendly" for a stored booking link (or a neutral fallback). */
export function schedulerName(url: string | null): string {
  const p = url ? parseSchedulerUrl(url)?.provider : null;
  return p ? SCHEDULER_INFO[p].name : "your scheduler";
}

/**
 * Booking products: which connected scheduler people book on, and which event link. Schedulers
 * are connected once in Connectors; the link defaults to the connected one and can point to any
 * event on that account.
 */
export function BookingSource({
  draft,
  schedulers,
  set,
  err,
}: {
  draft: { bookingUrl: string | null };
  schedulers: SchedulerConnection[];
  set: (patch: { bookingUrl: string | null }) => void;
  err: (field: string) => ReactNode;
}) {
  if (!schedulers.length) {
    return (
      <div className="rounded-xl border border-dashed border-border p-4">
        <p className="text-sm font-medium text-foreground">Connect a scheduler first</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Calls are booked on your own Calendly, Cal.com or Google Calendar page, which handles your availability, calendar conflicts and payment. Connect one once and every booking product can use it.
        </p>
        <ButtonLink href="/connectors" size="sm" className="mt-3">Open Connectors</ButtonLink>
        {err("bookingUrl")}
      </div>
    );
  }
  const current = draft.bookingUrl ? parseSchedulerUrl(draft.bookingUrl)?.provider ?? null : null;
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">People book on</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Scheduler">
          {schedulers.map((s) => {
            const on = current === s.provider;
            return (
              <button
                key={s.provider}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set({ bookingUrl: s.url })}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${on ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-foreground hover:border-primary"}`}
              >
                <BrandIcon brand={SCHEDULER_INFO[s.provider as Scheduler].icon} size={16} />
                {SCHEDULER_INFO[s.provider as Scheduler].name}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label htmlFor="pr-booking" className="mb-1.5 block text-xs font-medium text-muted-foreground">Event link</label>
        <input id="pr-booking" value={draft.bookingUrl ?? ""} onChange={(e) => set({ bookingUrl: e.target.value })} placeholder={current ? SCHEDULER_INFO[current].example : "Pick a scheduler above"} className={field} />
        <p className="mt-1 text-xs text-muted-foreground">
          Paste a specific event (e.g. your 30-minute call) or keep your main page. Price, length, reminders and payment are set in {current ? SCHEDULER_INFO[current].name : "your scheduler"}.{" "}
          <Link href="/connectors" className="font-medium text-primary hover:underline">Manage schedulers</Link>
        </p>
        {err("bookingUrl")}
      </div>
    </div>
  );
}
