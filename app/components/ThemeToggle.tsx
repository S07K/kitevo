"use client";

import { useAppearance } from "./Appearance";

export function ThemeToggle({ className }: { className?: string }) {
  const { mounted, isDark, toggleDark } = useAppearance();

  if (!mounted) return <div className="h-8 w-8" />;

  return (
    <button
      type="button"
      onClick={toggleDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors ${className ?? ""}`}
    >
      {isDark ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )}
    </button>
  );
}
