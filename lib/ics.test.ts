import { describe, it, expect } from "vitest";
import { bookingIcs } from "./ics";

describe("bookingIcs", () => {
  it("builds a valid single event with UTC times and escaped text", () => {
    const ics = bookingIcs({ uid: "b1", start: new Date("2026-11-05T04:30:00Z"), end: new Date("2026-11-05T05:00:00Z"), title: "Call, with Sana; 30 min", description: "Line 1\nLine 2", url: "https://meet.google.com/abc", organizerName: "Sana" });
    expect(ics).toContain("DTSTART:20261105T043000Z");
    expect(ics).toContain("DTEND:20261105T050000Z");
    expect(ics).toContain("SUMMARY:Call\\, with Sana\; 30 min");
    expect(ics).toContain("DESCRIPTION:Line 1\\nLine 2");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });
});
