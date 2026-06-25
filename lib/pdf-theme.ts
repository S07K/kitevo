import type { KitAppearancePreset } from "./kit-appearance";

export interface PdfTheme {
  bg: string;
  surface: string;
  accent: string;
  text: string;
  textMuted: string;
  border: string;
  label: string;
}

const THEMES: Record<KitAppearancePreset, PdfTheme> = {
  warm: {
    bg: "#F5F3F0", surface: "#FFFFFF", accent: "#1A1A1A",
    text: "#1A1A1A", textMuted: "#6B6560", border: "#E4E0DA", label: "Warm Sand",
  },
  cool: {
    bg: "#F0F2F5", surface: "#FFFFFF", accent: "#1E3A5F",
    text: "#1A1A1A", textMuted: "#5A6470", border: "#DDE2E8", label: "Cool Slate",
  },
  paper: {
    bg: "#F8F5EE", surface: "#FFFFFF", accent: "#111111",
    text: "#111111", textMuted: "#6B6560", border: "#E2DDD5", label: "Editorial Paper",
  },
  noir: {
    bg: "#111110", surface: "#1E1E1C", accent: "#F5F0E8",
    text: "#F5F0E8", textMuted: "#9A9490", border: "#2A2A28", label: "Noir",
  },
  editorial: {
    bg: "#111110", surface: "#1E1E1C", accent: "#F5F0E8",
    text: "#F5F0E8", textMuted: "#B0A99E", border: "#2A2A28", label: "Editorial",
  },
  studio: {
    bg: "#F0EEEB", surface: "#FFFFFF", accent: "#2D2D2B",
    text: "#2D2D2B", textMuted: "#6B6560", border: "#E0DDD8", label: "Studio",
  },
  bloom: {
    bg: "#F9F3EE", surface: "#FFFFFF", accent: "#C97B4B",
    text: "#2D1F14", textMuted: "#7A5C48", border: "#EDE3DA", label: "Bloom",
  },
  electric: {
    bg: "#0A0A14", surface: "#13131F", accent: "#6366F1",
    text: "#E8E8FF", textMuted: "#9898C0", border: "#1E1E30", label: "Electric",
  },
  noir_pro: {
    bg: "#111110", surface: "#1A1A18", accent: "#C9A84C",
    text: "#F5F0E8", textMuted: "#9A9490", border: "#2A2A28", label: "Noir Pro",
  },
};

export function getPdfTheme(preset?: string | null): PdfTheme {
  return THEMES[(preset ?? "warm") as KitAppearancePreset] ?? THEMES.warm;
}
