import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
const { normalizeProductInput, cleanEmail, newAccessToken } = await import("./commerce");

describe("normalizeProductInput", () => {
  it("cleans a draft and allows it to be incomplete", () => {
    const r = normalizeProductInput({ title: "  Preset pack  ", description: "x".repeat(2000), status: "draft" });
    expect(r.ok && r.value.title).toBe("Preset pack");
    expect(r.ok && r.value.description.length).toBe(1000);
    expect(r.ok && r.value.deliveryUrl).toBeNull();
  });
  it("needs a name and a link to publish", () => {
    expect(normalizeProductInput({ status: "published", deliveryUrl: "drive.google.com/x" })).toMatchObject({ ok: false, problem: { field: "title" } });
    expect(normalizeProductInput({ status: "published", title: "Guide" })).toMatchObject({ ok: false, problem: { field: "deliveryUrl" } });
    const ok = normalizeProductInput({ status: "published", title: "Guide", deliveryUrl: "drive.google.com/file/abc" });
    expect(ok.ok && ok.value.deliveryUrl).toBe("https://drive.google.com/file/abc");
  });
  it("rejects unsafe or non-web delivery links", () => {
    for (const bad of ["javascript:alert(1)", "me@example.com", "mailto:me@example.com", "ftp://x.com/f"]) {
      expect(normalizeProductInput({ title: "G", deliveryUrl: bad })).toMatchObject({ ok: false, problem: { field: "deliveryUrl" } });
    }
  });
  it("only accepts image data URLs as covers, within the size limit", () => {
    expect(normalizeProductInput({ coverUrl: "https://evil/x.png" }).ok && (normalizeProductInput({ coverUrl: "https://evil/x.png" }) as { value: { coverUrl: unknown } }).value.coverUrl).toBeNull();
    expect(normalizeProductInput({ coverUrl: "data:image/jpeg;base64," + "a".repeat(250_000) })).toMatchObject({ ok: false, problem: { field: "coverUrl" } });
  });
});

describe("cleanEmail / newAccessToken", () => {
  it("normalises emails and rejects junk", () => {
    expect(cleanEmail("  Maya@Example.COM ")).toBe("maya@example.com");
    for (const bad of ["", "maya", "maya@", "a@b", null, 5]) expect(cleanEmail(bad)).toBeNull();
  });
  it("makes long, unique, URL-safe tokens", () => {
    const a = newAccessToken(), b = newAccessToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(a).not.toBe(b);
  });
});

describe("normalizeProductInput: price", () => {
  it("reads a major-unit price from the editor and defaults to INR", () => {
    const r = normalizeProductInput({ title: "Guide", price: "499" });
    expect(r.ok && [r.value.priceCents, r.value.currency]).toEqual([49900, "INR"]);
    const u = normalizeProductInput({ title: "Guide", price: "19.5", currency: "USD" });
    expect(u.ok && [u.value.priceCents, u.value.currency]).toEqual([1950, "USD"]);
  });
  it("0 or blank is a free download; tiny, negative or huge prices are refused", () => {
    expect(normalizeProductInput({ title: "G", price: "" }).ok && (normalizeProductInput({ title: "G", price: "" }) as { value: { priceCents: number } }).value.priceCents).toBe(0);
    for (const bad of ["0.5", "-1", "100001", "abc"]) expect(normalizeProductInput({ title: "G", price: bad })).toMatchObject({ ok: false, problem: { field: "priceCents" } });
  });
  it("only allows supported currencies", () => {
    const r = normalizeProductInput({ title: "G", price: "5", currency: "BTC" });
    expect(r.ok && r.value.currency).toBe("INR");
  });
});

describe("normalizeProductInput: bookings", () => {
  it("keeps a scheduler link, canonicalised, and never charges through Kitevo", () => {
    const r = normalizeProductInput({ type: "booking", title: "Call", bookingUrl: "www.calendly.com/sana/30min?x=1", price: "499", status: "published" });
    expect(r.ok && [r.value.type, r.value.bookingUrl, r.value.priceCents]).toEqual(["booking", "https://calendly.com/sana/30min", 0]);
  });
  it("needs a recognised scheduler link to publish", () => {
    expect(normalizeProductInput({ type: "booking", title: "Call", status: "published" })).toMatchObject({ ok: false, problem: { field: "bookingUrl" } });
    expect(normalizeProductInput({ type: "booking", title: "Call", bookingUrl: "https://example.com/book" })).toMatchObject({ ok: false, problem: { field: "bookingUrl" } });
  });
  it("downloads ignore any booking link", () => {
    const r = normalizeProductInput({ title: "Guide", bookingUrl: "calendly.com/sana" });
    expect(r.ok && [r.value.type, r.value.bookingUrl]).toEqual(["download", null]);
  });
});
