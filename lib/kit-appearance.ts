/**
 * Per-kit visual theme for the public media kit (minimal presets, CSS variables).
 */

import type { CSSProperties } from "react";

export type KitAppearancePreset = "warm" | "cool" | "paper" | "noir";

export interface KitAppearance {
  /** Named palette; drives page background, text, cards, and CTA blocks. */
  preset?: KitAppearancePreset;
}

export const DEFAULT_KIT_APPEARANCE: KitAppearance = { preset: "warm" };

export const KIT_APPEARANCE_PRESET_LABELS: Record<KitAppearancePreset, string> = {
  warm: "Warm sand",
  cool: "Cool slate",
  paper: "Editorial paper",
  noir: "Noir",
};

/** CSS custom properties applied on the kit page root. */
export function kitAppearanceToCssVars(appearance: KitAppearance | null | undefined): CSSProperties {
  const preset = appearance?.preset ?? DEFAULT_KIT_APPEARANCE.preset ?? "warm";
  const vars = KIT_THEME_CSS_VARS[preset] ?? KIT_THEME_CSS_VARS.warm;
  return vars as unknown as CSSProperties;
}

const KIT_THEME_CSS_VARS: Record<KitAppearancePreset, Record<string, string>> = {
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

export function parseKitAppearance(raw: string | null | undefined): KitAppearance {
  if (!raw || raw === "{}") return { ...DEFAULT_KIT_APPEARANCE };
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return { ...DEFAULT_KIT_APPEARANCE };
    const preset = (o as { preset?: string }).preset;
    const valid: KitAppearancePreset[] = ["warm", "cool", "paper", "noir"];
    if (preset && valid.includes(preset as KitAppearancePreset)) {
      return { preset: preset as KitAppearancePreset };
    }
    return { ...DEFAULT_KIT_APPEARANCE };
  } catch {
    return { ...DEFAULT_KIT_APPEARANCE };
  }
}

export function serializeKitAppearance(a: KitAppearance): string {
  return JSON.stringify({ preset: a.preset ?? "warm" });
}

/** SVG / Recharts accents (CSS variables are unreliable inside Recharts SVG). */
export function kitChartColors(preset: KitAppearancePreset | undefined): { stroke: string; fillOpacity: number } {
  switch (preset ?? "warm") {
    case "cool":
      return { stroke: "#1E3A5F", fillOpacity: 0.15 };
    case "paper":
      return { stroke: "#111111", fillOpacity: 0.1 };
    case "noir":
      return { stroke: "#E8E8E8", fillOpacity: 0.12 };
    default:
      return { stroke: "#1A1A1A", fillOpacity: 0.15 };
  }
}
