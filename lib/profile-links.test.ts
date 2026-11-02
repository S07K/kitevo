import { describe, it, expect } from "vitest";
import { normalizeLinkUrl, normalizeLinks, MAX_LINKS } from "./profile-links";

describe("normalizeLinkUrl", () => {
  it("accepts web and email, adding what people leave out", () => {
    expect(normalizeLinkUrl("instagram.com/maya")).toBe("https://instagram.com/maya");
    expect(normalizeLinkUrl("https://tiktok.com/@maya")).toBe("https://tiktok.com/@maya");
    expect(normalizeLinkUrl("maya@example.com")).toBe("mailto:maya@example.com");
    expect(normalizeLinkUrl("mailto:maya@example.com")).toBe("mailto:maya@example.com");
  });
  it.each(["javascript:alert(1)", "JAVASCRIPT:alert(1)", "data:text/html,<b>x</b>", "vbscript:x", "ftp://x.com", "", "   ", "localhost", "mailto:nobody"])(
    "rejects %j",
    (raw) => expect(normalizeLinkUrl(raw)).toBeNull(),
  );
});

describe("normalizeLinks", () => {
  it("drops unsafe links, fills empty labels, caps the count", () => {
    const out = normalizeLinks([
      { label: "Site", url: "maya.com" },
      { label: "Bad", url: "javascript:alert(1)" },
      { label: "", url: "hello@maya.com" },
      { label: "", url: "https://www.youtube.com/@maya" },
      "junk",
      ...Array.from({ length: 20 }, (_, i) => ({ label: `L${i}`, url: `https://x${i}.com` })),
    ]);
    expect(out[0]).toEqual({ label: "Site", url: "https://maya.com/" });
    expect(out[1]).toEqual({ label: "Email", url: "mailto:hello@maya.com" });
    expect(out[2]).toEqual({ label: "youtube.com", url: "https://www.youtube.com/@maya" });
    expect(out.some((l) => l.url.startsWith("javascript"))).toBe(false);
    expect(out).toHaveLength(MAX_LINKS);
  });
  it("returns [] for non-arrays", () => {
    expect(normalizeLinks(null)).toEqual([]);
  });
});
