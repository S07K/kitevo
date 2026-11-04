"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandIcon } from "@/app/components/BrandIcon";
import { ButtonLink } from "@/app/components/workspace/Button";
import { SCHEDULER_INFO, parseSchedulerUrl, type Scheduler } from "@/lib/scheduler-links";
import { DEFAULT_BOOKING_LABEL, MAX_BOOKING_LABEL, type KitBooking } from "@/lib/kit-booking";
import { Switch } from "./Switch";

const field =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";

type Conn = { provider: Scheduler; url: string };

/**
 * Contact card: the kit's "Book a call" button. Uses a scheduler connected in Connectors;
 * the event link defaults to the connected page and can point to any event on it.
 */
export function BookCallField({ value, onChange }: { value: KitBooking; onChange: (v: KitBooking) => void }) {
  const [conns, setConns] = useState<Conn[] | null>(null);
  useEffect(() => {
    fetch("/api/scheduling/connections", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setConns)
      .catch(() => setConns([]));
  }, []);

  const on = !!value.url;
  const current = value.url ? (parseSchedulerUrl(value.url)?.provider ?? null) : null;
  const disconnected = !!current && !!conns && !conns.some((c) => c.provider === current);

  return (
    <div className="mb-5 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Book a call</p>
          <p className="mt-0.5 text-xs text-muted-foreground">A button under your profile that opens your scheduler, so people book a time without leaving.</p>
        </div>
        {conns && conns.length > 0 && (
          <Switch
            checked={on}
            onChange={(v) => onChange(v ? { url: conns[0].url, label: value.label } : { url: null, label: value.label })}
            label="Show Book a call on my kit"
          />
        )}
      </div>

      {conns === null ? null : conns.length === 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">Connect Calendly, Cal.com or Google Calendar first. It keeps your availability, calendar conflicts and any payment.</p>
          <ButtonLink href="/connectors" size="sm">Open Connectors</ButtonLink>
        </div>
      ) : on ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Scheduler">
            {conns.map((c) => (
              <button
                key={c.provider}
                type="button"
                role="radio"
                aria-checked={current === c.provider}
                onClick={() => onChange({ ...value, url: c.url })}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-colors ${
                  current === c.provider ? "border-primary bg-primary-soft text-primary-soft-foreground" : "border-border text-foreground hover:border-primary"
                }`}
              >
                <BrandIcon brand={SCHEDULER_INFO[c.provider].icon} size={15} />
                {SCHEDULER_INFO[c.provider].name}
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="bk-link" className="mb-1.5 block text-xs font-medium text-muted-foreground">Event link</label>
            <input id="bk-link" value={value.url ?? ""} onChange={(e) => onChange({ ...value, url: e.target.value })} placeholder={current ? SCHEDULER_INFO[current].example : ""} className={field} />
            {disconnected && (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                {SCHEDULER_INFO[current!].name} isn&apos;t connected, so the button is hidden. <Link href="/connectors" className="font-medium underline">Connect it</Link>
              </p>
            )}
          </div>
          <div>
            <label htmlFor="bk-label" className="mb-1.5 block text-xs font-medium text-muted-foreground">Button text</label>
            <input id="bk-label" value={value.label} maxLength={MAX_BOOKING_LABEL} onChange={(e) => onChange({ ...value, label: e.target.value })} placeholder={DEFAULT_BOOKING_LABEL} className={field} />
            <p className="mt-1 text-xs text-muted-foreground">e.g. “Partnership intro call” on a brand kit, “1:1 coaching” on a fan kit. Price and length are set in your scheduler.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
