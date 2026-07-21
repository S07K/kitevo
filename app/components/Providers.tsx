"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";

/*
  Light by default, and enableSystem is off deliberately: with it on, defaultTheme is
  ignored for anyone whose OS is set to dark, so "default light" would only apply to half
  of visitors. A creator sends their kit link to brands, and it should look the same to
  whoever opens it rather than depending on the reader's laptop setting.

  The ThemeToggle still works and next-themes persists an explicit choice, so anyone who
  picks dark keeps it.
*/
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  );
}
