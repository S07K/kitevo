import { describe, it, expect } from "vitest";
import { isGoogleShortLink, parseSchedulerUrl } from "./scheduler-links";

describe("parseSchedulerUrl", () => {
  it("Calendly profile and event links, with or without https/www", () => {
    expect(parseSchedulerUrl("calendly.com/sana")).toEqual({ provider: "calendly", url: "https://calendly.com/sana", embedUrl: "https://calendly.com/sana?embed_type=Inline&hide_gdpr_banner=1&hide_landing_page_details=1" });
    expect(parseSchedulerUrl("https://www.calendly.com/sana/30min?month=2026-11")?.url).toBe("https://calendly.com/sana/30min");
  });
  it("Cal.com user, event and team links (canonical cal.com host)", () => {
    expect(parseSchedulerUrl("https://cal.com/sana/30min")).toEqual({ provider: "calcom", url: "https://cal.com/sana/30min", embedUrl: "https://cal.com/sana/30min" });
    expect(parseSchedulerUrl("app.cal.com/team/acme/intro")?.url).toBe("https://cal.com/team/acme/intro");
    expect(parseSchedulerUrl("https://cal.com/settings/my-account")).toBeNull();
  });
  it("Google appointment schedules, normalised to the embeddable gv=true URL", () => {
    const id = "AcZssZ1abcDEFghiJKLmnoPQR";
    expect(parseSchedulerUrl(`https://calendar.google.com/calendar/u/0/appointments/schedules/${id}?pli=1`)).toEqual({
      provider: "google",
      url: `https://calendar.google.com/calendar/appointments/schedules/${id}`,
      embedUrl: `https://calendar.google.com/calendar/appointments/schedules/${id}?gv=true`,
    });
  });
  it.each(["", "javascript:alert(1)", "https://evil.com/calendly.com/sana", "https://calendly.com.evil.com/sana", "https://calendly.com/", "https://calendly.com/a/b/c", "https://calendly.com/<x>", "ftp://cal.com/sana", "https://calendar.google.com/calendar/r"])(
    "refuses %j",
    (v) => expect(parseSchedulerUrl(v)).toBeNull(),
  );
});

describe("isGoogleShortLink", () => {
  it("spots calendar.app.google links only", () => {
    expect(isGoogleShortLink("https://calendar.app.google/AbCdEf123456")).toBe(true);
    expect(isGoogleShortLink("calendar.app.google/AbCdEf123456")).toBe(true);
    expect(isGoogleShortLink("https://calendar.app.google.evil.com/AbCdEf123456")).toBe(false);
    expect(isGoogleShortLink("https://calendly.com/sana")).toBe(false);
  });
});
