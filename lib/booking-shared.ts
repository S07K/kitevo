/**
 * Bookings (Release C), client-safe: the booking config a creator sets on a "booking" product
 * and the pure slot maths. Times are generated in the CREATOR's time zone (their weekly hours)
 * and exchanged as UTC ISO strings; the buyer's page renders them in the buyer's own zone.
 * No date library: time-zone offsets come from Intl, which handles DST.
 */

export const BOOKING_DURATIONS = [15, 30, 45, 60, 90] as const;
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
/** How long a paid slot is held while the buyer is on the payment page. */
export const HOLD_MINUTES = 35;

export type DayWindow = { start: string; end: string }; // "09:00" – "17:00", creator's local time
export type BookingConfig = {
  durationMin: number;
  timezone: string; // IANA, e.g. "Asia/Kolkata"
  /** Index 0 = Sunday … 6 = Saturday; an empty list = unavailable that day. */
  weekly: DayWindow[][];
  noticeHours: number; // earliest bookable = now + notice
  horizonDays: number; // how far ahead buyers can book
  bufferMin: number; // gap kept after each booking
  meetingUrl: string; // the creator's own Zoom/Meet/… link, shown only after booking
};

export const DEFAULT_BOOKING: BookingConfig = {
  durationMin: 30,
  timezone: "UTC",
  weekly: [[], [{ start: "10:00", end: "17:00" }], [{ start: "10:00", end: "17:00" }], [{ start: "10:00", end: "17:00" }], [{ start: "10:00", end: "17:00" }], [{ start: "10:00", end: "17:00" }], []],
  noticeHours: 12,
  horizonDays: 30,
  bufferMin: 0,
  meetingUrl: "",
};

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Clean a config from the editor/API; anything invalid falls back to a safe default. */
export function normalizeBookingConfig(raw: unknown): BookingConfig {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown, min: number, max: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d);
  const durationMin = (BOOKING_DURATIONS as readonly number[]).includes(o.durationMin as number) ? (o.durationMin as number) : DEFAULT_BOOKING.durationMin;
  const weeklyRaw = Array.isArray(o.weekly) ? o.weekly : DEFAULT_BOOKING.weekly;
  const weekly = Array.from({ length: 7 }, (_, d) => {
    const day = Array.isArray(weeklyRaw[d]) ? (weeklyRaw[d] as unknown[]) : [];
    return day
      .map((w) => w as Partial<DayWindow>)
      .filter((w) => typeof w?.start === "string" && typeof w?.end === "string" && HHMM.test(w.start) && HHMM.test(w.end) && toMin(w.end) > toMin(w.start))
      .slice(0, 3)
      .map((w) => ({ start: w.start!, end: w.end! }));
  });
  const meetingUrl = typeof o.meetingUrl === "string" ? o.meetingUrl.trim().slice(0, 500) : "";
  return {
    durationMin,
    timezone: isValidTimeZone(o.timezone) ? (o.timezone as string) : "UTC",
    weekly,
    noticeHours: num(o.noticeHours, 0, 24 * 14, DEFAULT_BOOKING.noticeHours),
    horizonDays: num(o.horizonDays, 1, 90, DEFAULT_BOOKING.horizonDays),
    bufferMin: num(o.bufferMin, 0, 120, DEFAULT_BOOKING.bufferMin),
    meetingUrl,
  };
}

/* ─── Time-zone maths ─────────────────────────────────────────────────── */

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function parts(utcMs: number, tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short" });
    fmtCache.set(tz, f);
  }
  const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second, weekday: WEEKDAYS.indexOf(p.weekday as (typeof WEEKDAYS)[number]) };
}

/** Offset of `tz` from UTC at that instant, in ms (e.g. +5:30 → 19_800_000). */
export function tzOffsetMs(utcMs: number, tz: string): number {
  const p = parts(utcMs, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(utcMs / 1000) * 1000;
}

/** The UTC instant of a wall-clock time in `tz` (two passes, so DST edges resolve). */
export function zonedToUtc(y: number, m: number, d: number, minutesOfDay: number, tz: string): number {
  const guess = Date.UTC(y, m - 1, d, 0, minutesOfDay);
  let t = guess - tzOffsetMs(guess, tz);
  t = guess - tzOffsetMs(t, tz);
  return t;
}

/** Today's calendar date in `tz`. */
export function todayIn(tz: string, nowMs: number) {
  const p = parts(nowMs, tz);
  return { y: p.y, m: p.m, d: p.d };
}

/* ─── Slots ───────────────────────────────────────────────────────────── */

export type Busy = { start: number; end: number }; // UTC ms

/**
 * Every bookable start (UTC ms) from now to the horizon: inside the creator's weekly windows,
 * at least `noticeHours` away, stepping by duration + buffer, and not overlapping a busy
 * interval (existing bookings/holds, padded by the buffer).
 */
export function generateSlots(cfg: BookingConfig, busy: Busy[], nowMs: number): number[] {
  const out: number[] = [];
  const dur = cfg.durationMin * 60_000;
  const pad = cfg.bufferMin * 60_000;
  const earliest = nowMs + cfg.noticeHours * 3_600_000;
  const start = todayIn(cfg.timezone, nowMs);
  for (let i = 0; i < cfg.horizonDays; i++) {
    const day = new Date(Date.UTC(start.y, start.m - 1, start.d + i));
    const y = day.getUTCFullYear(), m = day.getUTCMonth() + 1, d = day.getUTCDate();
    for (const w of cfg.weekly[day.getUTCDay()] ?? []) {
      for (let t = toMin(w.start); t + cfg.durationMin <= toMin(w.end); t += cfg.durationMin + cfg.bufferMin) {
        const s = zonedToUtc(y, m, d, t, cfg.timezone);
        if (s < earliest) continue;
        const e = s + dur;
        if (busy.some((b) => s < b.end + pad && e + pad > b.start)) continue;
        out.push(s);
      }
    }
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

/** Whether `startMs` is one of the generated slots (server-side check before booking). */
export function isBookableSlot(cfg: BookingConfig, busy: Busy[], nowMs: number, startMs: number): boolean {
  return generateSlots(cfg, busy, nowMs).includes(startMs);
}

/** "Thu 6 Nov, 3:30 pm" in a given zone (buyer's or creator's). */
export function formatSlot(utcMs: number, tz: string, locale = "en-GB"): string {
  return new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(utcMs));
}
