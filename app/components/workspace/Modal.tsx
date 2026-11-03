"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog: portal to <body>, role="dialog" + aria-modal, labelled by its title,
 * Esc and backdrop click close it, Tab is trapped inside, and focus returns to whatever
 * opened it. `dismissible={false}` blocks closing while a request is in flight.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
  size = "sm",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Actions pinned under the scrolling body (always visible, however long the form). */
  footer?: ReactNode;
  dismissible?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef(onClose);
  const dismissRef = useRef(dismissible);
  useEffect(() => {
    closeRef.current = onClose;
    dismissRef.current = dismissible;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    // Focus the first field (or button) once the dialog is in the DOM.
    const t = setTimeout(() => {
      const el = panel.current;
      if (!el) return;
      const first = el.querySelector<HTMLElement>("input, textarea, select") ?? el.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? el).focus();
    }, 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissRef.current) {
        e.stopPropagation();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [open]);

  // Dialogs only open from a user action, so the server render (open=false) always matches.
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={() => dismissible && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        // Never taller than the viewport: the header and footer stay put, the body scrolls.
        className={`flex max-h-[calc(100dvh-2rem)] w-full flex-col ${size === "lg" ? "max-w-lg" : size === "md" ? "max-w-md" : "max-w-sm"} overflow-hidden rounded-2xl border border-border bg-background shadow-2xl focus:outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-1 pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1.5 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 ${footer ? "pb-4" : "pb-5"}`}>{children}</div>
        {footer && <div className="shrink-0 border-t border-border bg-background px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
