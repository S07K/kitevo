"use client";

import { useMemo } from "react";
import { BOOKING_DURATIONS, WEEKDAYS, type BookingConfig } from "@/lib/booking-shared";

const field =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";
const small = "rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40";

/** Show Monday first; WEEKDAYS / config.weekly are indexed Sunday = 0. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];

/** The booking half of the product editor: length, time zone, weekly hours, meeting link. */
export function BookingFields({ value, onChange, err }: { value: BookingConfig; onChange: (v: BookingConfig) => void; err: (field: string) => React.ReactNode }) {
  const zones = useMemo(() => {
    const all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
    return all.includes(value.timezone) ? all : [value.timezone, ...all];
  }, [value.timezone]);
  const set = (patch: Partial<BookingConfig>) => onChange({ ...value, ...patch });
  const setDay = (d: number, w: { start: string; end: string } | null) => {
    const weekly = value.weekly.map((x, i) => (i === d ? (w ? [w] : []) : x));
    set({ weekly });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="bk-len" className="mb-1.5 block text-xs font-medium text-muted-foreground">Length</label>
          <select id="bk-len" value={value.durationMin} onChange={(e) => set({ durationMin: Number(e.target.value) })} className={field}>
            {BOOKING_DURATIONS.map((m) => (
              <option key={m} value={m}>{m} minutes</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bk-tz" className="mb-1.5 block text-xs font-medium text-muted-foreground">Your time zone</label>
          <select id="bk-tz" value={value.timezone} onChange={(e) => set({ timezone: e.target.value })} className={field}>
            {zones.map((z) => (
              <option key={z} value={z}>{z.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">When you&apos;re available</p>
        <div className="divide-y divide-border rounded-xl border border-border">
          {ORDER.map((d) => {
            const w = value.weekly[d]?.[0] ?? null;
            return (
              <div key={d} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <label className="flex w-20 items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={!!w} onChange={(e) => setDay(d, e.target.checked ? { start: "10:00", end: "17:00" } : null)} className="accent-[var(--primary)]" />
                  {WEEKDAYS[d]}
                </label>
                {w ? (
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="time" aria-label={`${WEEKDAYS[d]} from`} value={w.start} step={900} onChange={(e) => setDay(d, { ...w, start: e.target.value })} className={small} />
                    to
                    <input type="time" aria-label={`${WEEKDAYS[d]} until`} value={w.end} step={900} onChange={(e) => setDay(d, { ...w, end: e.target.value })} className={small} />
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Unavailable</span>
                )}
              </div>
            );
          })}
        </div>
        {err("weekly")}
        <p className="mt-1 text-xs text-muted-foreground">
          Buyers see these hours in their own time zone. Bookings need {value.noticeHours} hours&apos; notice and open {value.horizonDays} days ahead.
        </p>
      </div>

      <div>
        <label htmlFor="bk-url" className="mb-1.5 block text-xs font-medium text-muted-foreground">Meeting link</label>
        <input id="bk-url" value={value.meetingUrl} onChange={(e) => set({ meetingUrl: e.target.value })} placeholder="zoom.us/j/… or meet.google.com/…" className={field} />
        <p className="mt-1 text-xs text-muted-foreground">Your own Zoom, Google Meet or other call link. Only shown to people who book.</p>
        {err("meetingUrl")}
      </div>
    </div>
  );
}
