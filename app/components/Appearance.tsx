"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { DEFAULT_PALETTE, PALETTES, isPaletteId, type PaletteId } from "@/lib/palettes";

const LAST_LIGHT_KEY = "kitevo-light-palette";

function readLastLight(): PaletteId {
  try {
    const v = localStorage.getItem(LAST_LIGHT_KEY);
    return isPaletteId(v) ? v : DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
}

function saveLastLight(id: PaletteId) {
  try {
    localStorage.setItem(LAST_LIGHT_KEY, id);
  } catch {
    /* private mode etc. — the palette still applies for this session */
  }
}

/**
 * Light palette + dark mode as two independent choices on top of next-themes' single
 * `theme`. Dark mode remembers which palette to return to.
 */
export function useAppearance() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";
  const palette: PaletteId = !mounted ? DEFAULT_PALETTE : isPaletteId(theme) ? theme : readLastLight();

  return {
    mounted,
    isDark,
    palette,
    /** Picking a palette also leaves dark mode, so the choice is visible straight away. */
    setPalette(id: PaletteId) {
      saveLastLight(id);
      setTheme(id);
    },
    toggleDark() {
      if (isDark) {
        setTheme(readLastLight());
      } else {
        if (isPaletteId(theme)) saveLastLight(theme);
        setTheme("dark");
      }
    },
  };
}

/** Row of palette swatches (radio group). `size="sm"` for menus, `"md"` for settings. */
export function PalettePicker({ size = "sm", showLabels = false }: { size?: "sm" | "md"; showLabels?: boolean }) {
  const { mounted, isDark, palette, setPalette } = useAppearance();
  const dot = size === "sm" ? "h-6 w-6" : "h-9 w-9";

  if (!mounted) return <div className={size === "sm" ? "h-6" : "h-14"} aria-hidden />;

  return (
    <div role="radiogroup" aria-label="Colour palette" className={`flex flex-wrap ${size === "sm" ? "gap-1.5" : "gap-3"}`}>
      {PALETTES.map((p) => {
        const active = !isDark && palette === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={p.label}
            title={p.label}
            onClick={() => setPalette(p.id)}
            className="group flex flex-col items-center gap-1.5 focus:outline-none"
          >
            <span
              className={`flex ${dot} items-center justify-center rounded-full border border-black/10 transition-shadow group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background ${
                active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "group-hover:ring-1 group-hover:ring-foreground/30 group-hover:ring-offset-1 group-hover:ring-offset-background"
              }`}
              style={{ backgroundColor: p.swatch }}
            >
              {active && <Check size={size === "sm" ? 12 : 15} className="text-black/70" aria-hidden />}
            </span>
            {showLabels && (
              <span className={`text-[11px] ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}>{p.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
