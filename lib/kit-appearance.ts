/**
 * Per-kit visual theme for the public media kit (minimal presets, CSS variables).
 */

import type { CSSProperties } from "react";
import type React from "react";

/** Free-tier basic presets. */
export type BasicPreset = "warm" | "cool" | "paper" | "noir";

/** Pro Brand Kit Vibes — 5 signature design styles. */
export type BrandKitVibe = "editorial" | "studio" | "bloom" | "electric" | "noir_pro";

export type KitAppearancePreset = BasicPreset | BrandKitVibe;

export interface KitAppearance {
  /** Named palette; drives page background, text, cards, and CTA blocks. */
  preset?: KitAppearancePreset;
  /** Pro: font pair id. */
  fontPair?: string;
  /** Pro: logo URL (hosted image). */
  logoUrl?: string;
}

export const BASIC_PRESETS: BasicPreset[] = ["warm", "cool", "paper", "noir"];
export const BRAND_KIT_VIBES: BrandKitVibe[] = ["editorial", "studio", "bloom", "electric", "noir_pro"];

export const DEFAULT_KIT_APPEARANCE: KitAppearance = { preset: "warm" };

export const KIT_APPEARANCE_PRESET_LABELS: Record<KitAppearancePreset, string> = {
  // Basic (free)
  warm: "Warm sand",
  cool: "Cool slate",
  paper: "Editorial paper",
  noir: "Noir",
  // Brand Kit Vibes (Pro)
  editorial: "Editorial",
  studio: "Studio",
  bloom: "Bloom",
  electric: "Electric",
  noir_pro: "Noir Pro",
};

export const BRAND_KIT_VIBE_META: Record<BrandKitVibe, { label: string; tagline: string; for: string; bg: string; fg: string }> = {
  editorial: { label: "Editorial", tagline: "Magazine-luxe. Vogue energy.", for: "Fashion · Beauty · Lifestyle", bg: "#111110", fg: "#f5f0e8" },
  studio:    { label: "Studio",   tagline: "Creative agency portfolio.",   for: "Design · Tech · Thought leaders", bg: "#f0eeeb", fg: "#2d2d2b" },
  bloom:     { label: "Bloom",    tagline: "Warm, organic, approachable.", for: "Food · Wellness · Travel", bg: "#f9f3ee", fg: "#c97b4b" },
  electric:  { label: "Electric", tagline: "High energy. Gen-Z native.",  for: "Gaming · Sports · Fashion-forward", bg: "#0a0a14", fg: "#6366f1" },
  noir_pro:  { label: "Noir Pro", tagline: "Dark. Cinematic. Premium.",   for: "Music · Streetwear · High-end", bg: "#111110", fg: "#c9a84c" },
};

/** CSS custom properties applied on the kit page root. */
export function kitAppearanceToCssVars(appearance: KitAppearance | null | undefined): CSSProperties {
  const preset = appearance?.preset ?? DEFAULT_KIT_APPEARANCE.preset ?? "warm";
  const vars = KIT_THEME_CSS_VARS[preset] ?? KIT_THEME_CSS_VARS.warm;
  return vars as unknown as CSSProperties;
}

/**
 * True when the preset's page background is dark. Derived from the preset's own `--mk-bg`
 * so it can't drift from the theme. Used to pick a contrasting treatment for the creator's
 * uploaded logo — a black logo on a dark vibe (or white on a light one) is invisible.
 */
export function isDarkKitPreset(preset: KitAppearancePreset | undefined): boolean {
  const vars = KIT_THEME_CSS_VARS[preset ?? "warm"] ?? KIT_THEME_CSS_VARS.warm;
  const hex = (vars["--mk-bg"] ?? "#ffffff").replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  // Rec. 601 luma is plenty for a light/dark decision.
  return 0.299 * r + 0.587 * g + 0.114 * b < 0.5;
}

const KIT_THEME_CSS_VARS: Record<KitAppearancePreset, Record<string, string>> = {
  // ── Brand Kit Vibes (Pro) ────────────────────────────────────────────────
  editorial: {
    "--mk-bg": "#111110",
    "--mk-bg-elevated": "#1a1a18",
    "--mk-surface": "#1e1e1c",
    "--mk-text": "#f5f0e8",
    "--mk-text-muted": "#b0a99e",
    "--mk-text-soft": "#7a7570",
    "--mk-border": "#2a2a28",
    "--mk-border-hairline": "#242422",
    "--mk-accent": "#f5f0e8",
    "--mk-accent-contrast": "#111110",
    "--mk-rates-bg": "#f5f0e8",
    "--mk-rates-text": "#111110",
    "--mk-rates-muted": "#888580",
    "--mk-chart-stroke": "#f5f0e8",
    "--mk-chart-fill": "rgba(245,240,232,0.12)",
    "--mk-header-bg": "rgba(17,17,16,0.92)",
  },
  studio: {
    "--mk-bg": "#f0eeeb",
    "--mk-bg-elevated": "#f8f7f5",
    "--mk-surface": "#ffffff",
    "--mk-text": "#2d2d2b",
    "--mk-text-muted": "#6a6a68",
    "--mk-text-soft": "#9a9a98",
    "--mk-border": "#dddbd8",
    "--mk-border-hairline": "#e5e3e0",
    "--mk-accent": "#2d2d2b",
    "--mk-accent-contrast": "#f0eeeb",
    "--mk-rates-bg": "#2d2d2b",
    "--mk-rates-text": "#f0eeeb",
    "--mk-rates-muted": "#9a9a98",
    "--mk-chart-stroke": "#2d2d2b",
    "--mk-chart-fill": "rgba(45,45,43,0.1)",
    "--mk-header-bg": "rgba(240,238,235,0.94)",
  },
  bloom: {
    "--mk-bg": "#f9f3ee",
    "--mk-bg-elevated": "#fefaf7",
    "--mk-surface": "#ffffff",
    "--mk-text": "#3d1f0d",
    "--mk-text-muted": "#8a5a3a",
    "--mk-text-soft": "#b08060",
    "--mk-border": "#e8ddd5",
    "--mk-border-hairline": "#eddfd5",
    "--mk-accent": "#c97b4b",
    "--mk-accent-contrast": "#ffffff",
    "--mk-rates-bg": "#3d1f0d",
    "--mk-rates-text": "#fdf5ef",
    "--mk-rates-muted": "#b08060",
    "--mk-chart-stroke": "#c97b4b",
    "--mk-chart-fill": "rgba(201,123,75,0.15)",
    "--mk-header-bg": "rgba(249,243,238,0.94)",
  },
  electric: {
    "--mk-bg": "#0a0a14",
    "--mk-bg-elevated": "#12121e",
    "--mk-surface": "#16162a",
    "--mk-text": "#f0f0f8",
    "--mk-text-muted": "#9090b8",
    "--mk-text-soft": "#606080",
    "--mk-border": "#1e1e32",
    "--mk-border-hairline": "#18182a",
    "--mk-accent": "#6366f1",
    "--mk-accent-contrast": "#ffffff",
    "--mk-rates-bg": "#6366f1",
    "--mk-rates-text": "#ffffff",
    "--mk-rates-muted": "#a8a8d0",
    "--mk-chart-stroke": "#6366f1",
    "--mk-chart-fill": "rgba(99,102,241,0.2)",
    "--mk-header-bg": "rgba(10,10,20,0.92)",
  },
  noir_pro: {
    "--mk-bg": "#111110",
    "--mk-bg-elevated": "#181816",
    "--mk-surface": "#1c1c1a",
    "--mk-text": "#f0ede8",
    "--mk-text-muted": "#a0998e",
    "--mk-text-soft": "#706960",
    "--mk-border": "#252520",
    "--mk-border-hairline": "#202018",
    "--mk-accent": "#c9a84c",
    "--mk-accent-contrast": "#111110",
    "--mk-rates-bg": "#c9a84c",
    "--mk-rates-text": "#111110",
    "--mk-rates-muted": "#806540",
    "--mk-chart-stroke": "#c9a84c",
    "--mk-chart-fill": "rgba(201,168,76,0.15)",
    "--mk-header-bg": "rgba(17,17,16,0.92)",
  },
  warm: {
    "--mk-bg": "#F5F3F0",
    "--mk-bg-elevated": "#FAF8F5",
    "--mk-surface": "#FFFFFF",
    "--mk-text": "#1A1A1A",
    "--mk-text-muted": "#6B6560",
    "--mk-text-soft": "#8C8782",
    "--mk-border": "#E8E4E0",
    "--mk-border-hairline": "#E5E2DE",
    "--mk-accent": "#1A1A1A",
    "--mk-accent-contrast": "#FFFFFF",
    "--mk-rates-bg": "#1A1A1A",
    "--mk-rates-text": "#FFFFFF",
    "--mk-rates-muted": "#A3A3A3",
    "--mk-chart-stroke": "#1A1A1A",
    "--mk-chart-fill": "rgba(26,26,26,0.12)",
    "--mk-header-bg": "rgba(245,243,240,0.92)",
  },
  cool: {
    "--mk-bg": "#F0F3F7",
    "--mk-bg-elevated": "#F5F7FA",
    "--mk-surface": "#FFFFFF",
    "--mk-text": "#15202B",
    "--mk-text-muted": "#5C6B7A",
    "--mk-text-soft": "#7A8A99",
    "--mk-border": "#DDE4EC",
    "--mk-border-hairline": "#D5DEE8",
    "--mk-accent": "#1E3A5F",
    "--mk-accent-contrast": "#FFFFFF",
    "--mk-rates-bg": "#1E3A5F",
    "--mk-rates-text": "#FFFFFF",
    "--mk-rates-muted": "#B8C5D6",
    "--mk-chart-stroke": "#1E3A5F",
    "--mk-chart-fill": "rgba(30,58,95,0.12)",
    "--mk-header-bg": "rgba(240,243,247,0.92)",
  },
  paper: {
    "--mk-bg": "#FAFAF8",
    "--mk-bg-elevated": "#FFFFFF",
    "--mk-surface": "#FFFFFF",
    "--mk-text": "#111111",
    "--mk-text-muted": "#555555",
    "--mk-text-soft": "#888888",
    "--mk-border": "#EAEAEA",
    "--mk-border-hairline": "#E0E0E0",
    "--mk-accent": "#111111",
    "--mk-accent-contrast": "#FFFFFF",
    "--mk-rates-bg": "#111111",
    "--mk-rates-text": "#FFFFFF",
    "--mk-rates-muted": "#AAAAAA",
    "--mk-chart-stroke": "#111111",
    "--mk-chart-fill": "rgba(17,17,17,0.08)",
    "--mk-header-bg": "rgba(250,250,248,0.94)",
  },
  noir: {
    "--mk-bg": "#121212",
    "--mk-bg-elevated": "#181818",
    "--mk-surface": "#1C1C1C",
    "--mk-text": "#F5F5F5",
    "--mk-text-muted": "#A8A8A8",
    "--mk-text-soft": "#8A8A8A",
    "--mk-border": "#2E2E2E",
    "--mk-border-hairline": "#2A2A2A",
    "--mk-accent": "#F5F5F5",
    "--mk-accent-contrast": "#121212",
    "--mk-rates-bg": "#E8E8E8",
    "--mk-rates-text": "#121212",
    "--mk-rates-muted": "#555555",
    "--mk-chart-stroke": "#E8E8E8",
    "--mk-chart-fill": "rgba(232,232,232,0.08)",
    "--mk-header-bg": "rgba(18,18,18,0.92)",
  },
};

const ALL_VALID_PRESETS: KitAppearancePreset[] = [
  "warm", "cool", "paper", "noir",
  "editorial", "studio", "bloom", "electric", "noir_pro",
];

export function parseKitAppearance(raw: string | null | undefined): KitAppearance {
  if (!raw || raw === "{}") return { ...DEFAULT_KIT_APPEARANCE };
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return { ...DEFAULT_KIT_APPEARANCE };
    const obj = o as Record<string, unknown>;
    const preset = obj.preset as string | undefined;
    const result: KitAppearance = { ...DEFAULT_KIT_APPEARANCE };
    if (preset && ALL_VALID_PRESETS.includes(preset as KitAppearancePreset)) {
      result.preset = preset as KitAppearancePreset;
    }
    if (typeof obj.fontPair === "string") result.fontPair = obj.fontPair;
    if (typeof obj.logoUrl === "string") result.logoUrl = obj.logoUrl;
    return result;
  } catch {
    return { ...DEFAULT_KIT_APPEARANCE };
  }
}

export function serializeKitAppearance(a: KitAppearance): string {
  const obj: Record<string, unknown> = { preset: a.preset ?? "warm" };
  if (a.logoUrl) obj.logoUrl = a.logoUrl;
  return JSON.stringify(obj);
}

/** SVG / Recharts accents (CSS variables are unreliable inside Recharts SVG). */
export function kitChartColors(preset: KitAppearancePreset | undefined): { stroke: string; fillOpacity: number } {
  switch (preset ?? "warm") {
    case "cool":      return { stroke: "#1E3A5F", fillOpacity: 0.15 };
    case "paper":     return { stroke: "#111111", fillOpacity: 0.10 };
    case "noir":      return { stroke: "#E8E8E8", fillOpacity: 0.12 };
    case "editorial": return { stroke: "#f5f0e8", fillOpacity: 0.12 };
    case "studio":    return { stroke: "#2d2d2b", fillOpacity: 0.10 };
    case "bloom":     return { stroke: "#c97b4b", fillOpacity: 0.15 };
    case "electric":  return { stroke: "#6366f1", fillOpacity: 0.20 };
    case "noir_pro":  return { stroke: "#c9a84c", fillOpacity: 0.15 };
    default:          return { stroke: "#1A1A1A", fillOpacity: 0.15 };
  }
}

export function kitAppearanceToCssVarsWithOverrides(appearance: KitAppearance | null | undefined): React.CSSProperties {
  return kitAppearanceToCssVars(appearance) as React.CSSProperties;
}
