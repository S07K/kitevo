/**
 * Light colour palettes for the app chrome (workspace, marketing, auth pages). Each id is a
 * next-themes theme; its CSS tokens live in app/globals.css under `.theme-<id>` (the
 * default, "paper", is `:root`). Dark mode is its own theme ("dark") and ignores the
 * palette; switching back to light restores the last palette picked.
 *
 * Public kit pages are unaffected: they render in the kit's own vibe colours, so a brand
 * sees a creator's kit the same way regardless of their own palette.
 */
export const PALETTES = [
  { id: "light", label: "Paper", swatch: "#e9dcc4" },
  { id: "sage", label: "Sage", swatch: "#c6d6bc" },
  { id: "mist", label: "Mist", swatch: "#c3d3e8" },
  { id: "blush", label: "Blush", swatch: "#ecc8c0" },
  { id: "lavender", label: "Lavender", swatch: "#d2cbee" },
  { id: "classic", label: "Classic", swatch: "#e8e6e2" },
] as const;

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "light";

/** Every next-themes theme name, light palettes first. */
export const THEME_NAMES: string[] = [...PALETTES.map((p) => p.id), "dark"];

/** next-themes `value` map: theme name → class put on <html>. */
export const THEME_CLASSES: Record<string, string> = Object.fromEntries([
  ...PALETTES.map((p) => [p.id, p.id === "light" ? "light" : `theme-${p.id}`]),
  ["dark", "dark"],
]);

export function isPaletteId(v: unknown): v is PaletteId {
  return PALETTES.some((p) => p.id === v);
}
