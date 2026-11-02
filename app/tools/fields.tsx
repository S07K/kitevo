"use client";

import { useId, type ReactNode } from "react";
import { PLATFORM_LABEL, type Platform } from "@/lib/creator-calculators";

/** "12,500" / "12.5k" / "1.2m" → 12500. Empty or junk → undefined. */
export function parseCount(raw: string): number | undefined {
  const s = raw.trim().toLowerCase().replace(/[, _]/g, "");
  const m = /^(\d+(?:\.\d+)?)([km]?)$/.exec(s);
  if (!m) return undefined;
  const n = Number(m[1]) * (m[2] === "k" ? 1_000 : m[2] === "m" ? 1_000_000 : 1);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
}

export function usd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function PlatformPicker({ value, onChange }: { value: Platform; onChange: (p: Platform) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1" role="radiogroup" aria-label="Platform">
      {(Object.keys(PLATFORM_LABEL) as Platform[]).map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          className={`h-9 rounded-full px-3 text-sm font-medium transition-colors ${
            value === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {PLATFORM_LABEL[p]}
        </button>
      ))}
    </div>
  );
}

export function NumberField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  optional,
  suffix,
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  optional?: boolean;
  suffix?: string;
}) {
  const id = useId();
  const invalid = value.trim() !== "" && parseCount(value) === undefined && !(suffix === "%" && Number(value) > 0);
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-medium text-foreground">
        {label}
        {optional && <span className="text-xs font-normal text-muted-foreground">Optional</span>}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`h-11 w-full rounded-xl border bg-background px-4 text-base tabular-nums text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
            suffix ? "pr-10" : ""
          } ${invalid ? "border-red-400 dark:border-red-500/70" : "border-border"}`}
        />
        {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {invalid ? (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">Enter a number, like 12500 or 12.5k.</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-muted ring-1 ring-border transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-background after:shadow after:transition-transform peer-checked:after:translate-x-4"
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}
