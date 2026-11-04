/** A single-event iCalendar file (RFC 5545) for "Add to calendar". */
function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function bookingIcs(p: { uid: string; start: Date; end: Date; title: string; description: string; url: string; organizerName: string }): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kitevo//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${p.uid}@getkitevo.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(p.start)}`,
    `DTEND:${stamp(p.end)}`,
    `SUMMARY:${esc(p.title)}`,
    `DESCRIPTION:${esc(p.description)}`,
    `LOCATION:${esc(p.url)}`,
    `URL:${esc(p.url)}`,
    `ORGANIZER;CN=${esc(p.organizerName)}:mailto:no-reply@getkitevo.com`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
