"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { TroopyIdentity } from "./TroopyIdentity";
import { THEME_CLASSES, THEME_NAMES } from "@/lib/palettes";

/*
  Light by default, and enableSystem is off deliberately: with it on, defaultTheme is
  ignored for anyone whose OS is set to dark, so "default light" would only apply to half
  of visitors. A creator sends their kit link to brands, and it should look the same to
  whoever opens it rather than depending on the reader's laptop setting.

  The ThemeToggle still works and next-themes persists an explicit choice, so anyone who
  picks dark keeps it.

  Light comes in several palettes (lib/palettes.ts): "light" is the default Paper palette,
  the others put a `theme-<id>` class on <html>. Tokens per palette live in globals.css.
*/
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      themes={THEME_NAMES}
      value={THEME_CLASSES}
      disableTransitionOnChange
    >
      <SessionProvider>
        <TroopyIdentity />
        {children}
      </SessionProvider>
    </ThemeProvider>
  );
}
