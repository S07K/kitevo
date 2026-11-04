import { describe, it, expect } from "vitest";
import { DEFAULT_BOOKING, generateSlots, isBookableSlot, normalizeBookingConfig, tzOffsetMs, zonedToUtc, type BookingConfig } from "./booking-shared";

const cfg = (o: Partial<BookingConfig> = {}): BookingConfig => ({ ...DEFAULT_BOOKING, timezone: "Asia/Kolkata", noticeHours: 0, horizonDays: 1, weekly: [[], [], [], [], [], [], []], ...o });
const iso = (ms: number) => new Date(ms).toISOString();

describe("time zones", () => {
  it("converts wall-clock time in a zone to UTC", () => {
    expect(iso(zonedToUtc(2026, 11, 5, 10 * 60, "Asia/Kolkata"))).toBe("2026-11-05T04:30:00.000Z");
    expect(iso(zonedToUtc(2026, 11, 5, 10 * 60, "America/New_York"))).toBe("2026-11-05T15:00:00.000Z"); // EST
    expect(iso(zonedToUtc(2026, 7, 5, 10 * 60, "America/New_York"))).toBe("2026-07-05T14:00:00.000Z"); // EDT
  });
  it("knows the offset on each side of a DST change", () => {
    expect(tzOffsetMs(Date.UTC(2026, 2, 28, 12), "Europe/London")).toBe(0);
    expect(tzOffsetMs(Date.UTC(2026, 2, 30, 12), "Europe/London")).toBe(3_600_000);
  });
});

describe("generateSlots", () => {
  // Thu 5 Nov 2026, 00:00 IST = 4 Nov 18:30 UTC
  const now = Date.UTC(2026, 10, 4, 18, 30);
  const thursday = (w: { start: string; end: string }[]) => { const a: BookingConfig["weekly"] = [[], [], [], [], [], [], []]; a[4] = w; return a; };

  it("steps through a window by the duration, in the creator's zone", () => {
    const s = generateSlots(cfg({ weekly: thursday([{ start: "10:00", end: "12:00" }]), durationMin: 30 }), [], now);
    expect(s.map(iso)).toEqual(["2026-11-05T04:30:00.000Z", "2026-11-05T05:00:00.000Z", "2026-11-05T05:30:00.000Z", "2026-11-05T06:00:00.000Z"]);
  });
  it("never lets a slot run past the window end, and applies the buffer", () => {
    const s = generateSlots(cfg({ weekly: thursday([{ start: "10:00", end: "11:40" }]), durationMin: 30, bufferMin: 15 }), [], now);
    expect(s.map(iso)).toEqual(["2026-11-05T04:30:00.000Z", "2026-11-05T05:15:00.000Z"]);
  });
  it("skips slots inside the notice period", () => {
    const s = generateSlots(cfg({ weekly: thursday([{ start: "10:00", end: "12:00" }]), noticeHours: 11 }), [], now);
    expect(s.map(iso)).toEqual(["2026-11-05T05:30:00.000Z", "2026-11-05T06:00:00.000Z"]); // earliest 05:30Z
  });
  it("skips slots that overlap an existing booking (padded by the buffer)", () => {
    const busy = [{ start: Date.UTC(2026, 10, 5, 5, 0), end: Date.UTC(2026, 10, 5, 5, 30) }];
    const s = generateSlots(cfg({ weekly: thursday([{ start: "10:00", end: "12:00" }]) }), busy, now);
    expect(s.map(iso)).toEqual(["2026-11-05T04:30:00.000Z", "2026-11-05T05:30:00.000Z", "2026-11-05T06:00:00.000Z"]);
    expect(generateSlots(cfg({ weekly: thursday([{ start: "10:00", end: "12:00" }]), bufferMin: 10 }), busy, now).map(iso)).toEqual(["2026-11-05T05:50:00.000Z"]); // 40-min steps: 10:00, 10:40 clash; 11:20 IST is free
  });
  it("only offers days with hours, up to the horizon", () => {
    expect(generateSlots(cfg({ horizonDays: 7 }), [], now)).toEqual([]);
    expect(generateSlots(cfg({ horizonDays: 8, weekly: thursday([{ start: "10:00", end: "10:30" }]) }), [], now)).toHaveLength(2); // this Thu + next Thu
  });
  it("isBookableSlot only accepts a generated start", () => {
    const c = cfg({ weekly: thursday([{ start: "10:00", end: "12:00" }]) });
    expect(isBookableSlot(c, [], now, Date.UTC(2026, 10, 5, 4, 30))).toBe(true);
    expect(isBookableSlot(c, [], now, Date.UTC(2026, 10, 5, 4, 45))).toBe(false);
  });
});

describe("normalizeBookingConfig", () => {
  it("falls back to safe values for anything invalid", () => {
    const c = normalizeBookingConfig({ durationMin: 7, timezone: "Mars/Base", weekly: [[{ start: "18:00", end: "09:00" }], [{ start: "25:00", end: "26:00" }]], noticeHours: -5, horizonDays: 999 });
    expect(c.durationMin).toBe(30);
    expect(c.timezone).toBe("UTC");
    expect(c.weekly.every((d) => d.length === 0)).toBe(true);
    expect([c.noticeHours, c.horizonDays]).toEqual([0, 90]);
  });
  it("keeps a valid config", () => {
    const c = normalizeBookingConfig({ durationMin: 60, timezone: "Europe/London", weekly: [[], [{ start: "09:00", end: "12:00" }]], meetingUrl: " https://meet.google.com/abc " });
    expect([c.durationMin, c.timezone, c.weekly[1], c.meetingUrl]).toEqual([60, "Europe/London", [{ start: "09:00", end: "12:00" }], "https://meet.google.com/abc"]);
  });
});
