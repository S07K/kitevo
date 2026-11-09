import { describe, it, expect } from "vitest";
import { BRAND_ICONS, FAVICON_ICONS } from "./brand-icons";

// BrandIcon injects these SVG strings as HTML, so a compromised package release must fail CI.
describe("brand icons from thesvg", () => {
  for (const [id, icon] of Object.entries(BRAND_ICONS)) {
    it(`${id} is plain SVG with no script, handlers or external references`, () => {
      // The variants BrandIcon renders: default and mono.
      for (const svg of [icon.svg, icon.variants.mono].filter(Boolean) as string[]) {
        expect(svg.trim().startsWith("<svg")).toBe(true);
        expect(svg).not.toMatch(/<script|<foreignObject|\son[a-z]+\s*=|javascript:/i);
        expect(svg).not.toMatch(/(?:xlink:)?href\s*=\s*["'](?!#)/i); // only in-document refs (#id)
      }
    });
  }

  it("no two brands share an SVG id (they're inlined into one page)", () => {
    const seen = new Map<string, string>();
    for (const [brand, icon] of Object.entries(BRAND_ICONS)) {
      for (const svg of [icon.svg, ...Object.values(icon.variants)]) {
        for (const [, id] of svg.matchAll(/\bid="([^"]+)"/g)) {
          const owner = seen.get(id);
          expect(owner === undefined || owner === brand, `${id} used by ${owner} and ${brand}`).toBe(true);
          seen.set(id, brand);
        }
        // Every reference points at an id in the same SVG (favicon brands never render their SVG;
        // thesvg's old OpenRouter mark references a clip path it doesn't define).
        if (brand in FAVICON_ICONS) continue;
        for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(svg).toContain(`id="${ref}"`);
      }
    }
  });
});
