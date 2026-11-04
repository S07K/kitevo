import { describe, it, expect } from "vitest";
import { normalizeKitBooking, publicBooking } from "./kit-booking";

describe("normalizeKitBooking", () => {
  it("reads stored JSON or an object, canonicalising the link and tidying the label", () => {
    expect(normalizeKitBooking('{"url":"www.calendly.com/sana/30min?x=1","label":"  Intro   call "}')).toEqual({ url: "https://calendly.com/sana/30min", label: "Intro call" });
    expect(normalizeKitBooking({ url: "cal.com/sana", label: "x".repeat(60) })).toEqual({ url: "https://cal.com/sana", label: "x".repeat(40) });
  });
  it("drops unknown links and survives junk", () => {
    expect(normalizeKitBooking({ url: "https://example.com/book", label: "Hi" })).toEqual({ url: null, label: "Hi" });
    expect(normalizeKitBooking("not json")).toEqual({ url: null, label: "" });
    expect(normalizeKitBooking(null)).toEqual({ url: null, label: "" });
    expect(normalizeKitBooking({ url: "javascript:alert(1)" }).url).toBeNull();
  });
});

describe("publicBooking", () => {
  const b = { url: "https://calendly.com/sana/30min", label: "" };
  it("shows only while the link's scheduler is connected, with a default label", () => {
    expect(publicBooking(b, ["calendly"])).toEqual({
      label: "Book a call",
      url: "https://calendly.com/sana/30min",
      embedUrl: "https://calendly.com/sana/30min?embed_type=Inline&hide_gdpr_banner=1&hide_landing_page_details=1",
      provider: "calendly",
      providerName: "Calendly",
    });
    expect(publicBooking(b, ["calcom"])).toBeNull();
    expect(publicBooking({ url: null, label: "x" }, ["calendly"])).toBeNull();
  });
});
