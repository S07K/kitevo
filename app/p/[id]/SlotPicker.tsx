"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Pick a time for a booking, shown in the BUYER's own time zone. Slots come from
 * /api/products/[id]/slots as UTC ISO strings. Renders nothing time-specific on the server
 * (times depend on the browser's zone), so there's no hydration mismatch.
 */
export function SlotPicker({
  productId,
  value,
  onChange,
  refreshKey,
}: {
  productId: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  /** Bump to refetch (e.g. after "that time was just taken"). */
  refreshKey: number;
}) {
  const [slots, setSlots] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const tz = useMemo(() => (typeof window === "undefined" ? "UTC" : Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const [day, setDay] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products/${productId}/slots`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { slots: string[] }) => {
        if (cancelled) return;
        setSlots(d.slots);
        setFailed(false);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [productId, refreshKey]);

  // Group by the buyer's local calendar day.
  const days = useMemo(() => {
    const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    const map = new Map<string, string[]>();
    for (const s of slots ?? []) {
      const k = dayKey.format(new Date(s));
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()];
  }, [slots, tz]);

  const activeDay = day && days.some(([k]) => k === day) ? day : days[0]?.[0] ?? null;
  const times = days.find(([k]) => k === activeDay)?.[1] ?? [];
  const dayLabel = (k: string) => {
    const [y, m, d] = k.split("-").map(Number);
    return new Intl.DateTimeFormat(undefined, { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(Date.UTC(y, m - 1, d)));
  };
  const timeLabel = (iso: string) => new Intl.DateTimeFormat(undefined, { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  if (failed) return <p className="font-sans text-sm text-red-600">Couldn&apos;t load times. Refresh to try again.</p>;
  if (!slots) return <p className="font-sans text-sm text-[var(--mk-text-muted)]">Loading available times…</p>;
  if (!days.length) return <p className="font-sans text-sm text-[var(--mk-text-muted)]">No open times right now. Check back soon.</p>;

  const chip = (on: boolean) =>
    `shrink-0 rounded-xl border px-3 py-2 font-sans text-sm transition-colors ${on ? "border-[var(--mk-text)] bg-[var(--mk-text)] text-[var(--mk-bg)]" : "border-[var(--mk-border)] text-[var(--mk-text)] hover:border-[var(--mk-text)]"}`;
  return (
    <fieldset className="min-w-0 space-y-3">
      <legend className="mb-2 font-sans text-xs font-medium text-[var(--mk-text-muted)]">
        Pick a time <span className="text-[var(--mk-text-soft)]">· {tz.replace(/_/g, " ")}</span>
      </legend>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Day">
        {days.map(([k]) => (
          <button key={k} type="button" aria-pressed={k === activeDay} onClick={() => { setDay(k); onChange(null); }} className={chip(k === activeDay)}>
            {dayLabel(k)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Time">
        {times.map((s) => (
          <button key={s} type="button" aria-pressed={s === value} onClick={() => onChange(s)} className={`${chip(s === value)} text-center`}>
            {timeLabel(s)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** The buyer's IANA zone (sent with the booking so emails and the booking page use it). */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
