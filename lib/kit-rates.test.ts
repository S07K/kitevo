import { describe, it, expect } from "vitest";
import { normalizeRates, hasPublicRates, publicRateItems, MAX_RATE_ITEMS, MAX_RATE_LABEL } from "./kit-rates";

describe("normalizeRates", () => {
  it("returns empty, hidden rates for junk", () => {
    for (const raw of [null, undefined, "x", 5, []]) {
      expect(normalizeRates(raw)).toEqual({ show: false, items: [] });
    }
  });

  it("keeps old single-amount rows working", () => {
    expect(normalizeRates({ show: true, fromAmount: 2500, ctaLabel: "Get in touch" })).toEqual({
      show: true,
      items: [],
      fromAmount: 2500,
      ctaLabel: "Get in touch",
    });
  });

  it("cleans items: trims, rounds, drops negatives and empty rows, caps count and length", () => {
    const r = normalizeRates({
      show: true,
      items: [
        { id: "a", label: "  Instagram Reel ", price: "450.6" },
        { id: "b", label: "Bad price", price: -3 },
        { id: "c", label: "", price: "" },
        { label: "x".repeat(200), price: 10 },
        ...Array.from({ length: 20 }, (_, i) => ({ id: `z${i}`, label: `Item ${i}`, price: i })),
      ],
    });
    expect(r.items![0]).toEqual({ id: "a", label: "Instagram Reel", price: 451 });
    expect(r.items![1]).toEqual({ id: "b", label: "Bad price", price: undefined });
    expect(r.items!.find((i) => i.id === "c")).toBeUndefined();
    expect(r.items![2].label).toHaveLength(MAX_RATE_LABEL);
    expect(r.items!.length).toBe(MAX_RATE_ITEMS);
  });

  it("only shows when explicitly true", () => {
    expect(normalizeRates({ show: "yes", items: [{ label: "A", price: 1 }] }).show).toBe(false);
  });
});

describe("public rate card", () => {
  it("shows only complete items and needs show=true plus something to show", () => {
    const rates = normalizeRates({ show: true, items: [{ id: "a", label: "Reel", price: 450 }, { id: "b", label: "No price" }] });
    expect(publicRateItems(rates).map((i) => i.id)).toEqual(["a"]);
    expect(hasPublicRates(rates)).toBe(true);
    expect(hasPublicRates({ ...rates, show: false })).toBe(false);
    expect(hasPublicRates(normalizeRates({ show: true, items: [{ label: "No price" }] }))).toBe(false);
    expect(hasPublicRates(normalizeRates({ show: true, fromAmount: 500 }))).toBe(true);
    expect(hasPublicRates(null)).toBe(false);
  });
});
