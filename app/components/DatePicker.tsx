"use client";

import { useEffect, useRef, useState } from "react";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseValue(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplay(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  minDate,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: Date;
}) {
  const selected = parseValue(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const min = minDate ?? today;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState((selected ?? today).getFullYear());
  const [viewMonth, setViewMonth] = useState((selected ?? today).getMonth());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    onChange(toYMD(d));
    setOpen(false);
  }

  function isDisabled(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    return d < min;
  }

  function isSelected(day: number) {
    if (!selected) return false;
    return (
      selected.getFullYear() === viewYear &&
      selected.getMonth() === viewMonth &&
      selected.getDate() === day
    );
  }

  function isToday(day: number) {
    const t = new Date();
    return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === day;
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border bg-muted/30 px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 ${
          open ? "border-foreground/40" : "border-border hover:border-foreground/30"
        }`}
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selected && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
              aria-label="Clear date"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </span>
          )}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
        </div>
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-border bg-background p-4 shadow-xl">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <p className="text-sm font-semibold text-foreground">
              {MONTHS[viewMonth]} {viewYear}
            </p>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          {/* Day labels */}
          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {DAYS.map((d) => (
              <div key={d} className="flex items-center justify-center">
                <span className="text-[10px] font-semibold text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const disabled = isDisabled(day);
              const sel = isSelected(day);
              const tod = isToday(day);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className={`flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                    sel
                      ? "bg-foreground text-background"
                      : disabled
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : tod
                      ? "text-foreground ring-1 ring-border hover:bg-muted"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-3 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => { onChange(toYMD(today)); setOpen(false); }}
              className="w-full rounded-lg py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
