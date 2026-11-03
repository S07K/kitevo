import { describe, it, expect } from "vitest";
import { BRAND_ICONS } from "./brand-icons";

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
});
