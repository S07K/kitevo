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
