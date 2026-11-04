"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { BrandIcon } from "@/app/components/BrandIcon";
import type { PublicBooking } from "@/lib/kit-booking";

/**
 * The creator's own scheduler (Calendly / Cal.com / Google appointment schedule) in a dialog
 * over the kit, so visitors book without leaving. Portalled to <body>: the kit is a
 * container-query root, which would re-anchor a fixed overlay to the kit instead of the window.
 * The iframe URL comes from parseSchedulerUrl (known hosts only).
 */
export function BookCallDialog({ booking, creatorName, open, onClose }: { booking: PublicBooking; creatorName: string; open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${booking.label} with ${creatorName}`}
        className="flex h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:h-[min(90dvh,820px)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-black/10 px-4 py-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-black/10">
            <BrandIcon brand={booking.provider === "google" ? "googlecalendar" : booking.provider} size={15} lightOnly />
          </span>
          <p className="min-w-0 flex-1 truncate font-sans text-sm font-semibold text-neutral-900">
            {booking.label} <span className="font-normal text-neutral-500">with {creatorName}</span>
          </p>
          <a href={booking.url} target="_blank" rel="noopener noreferrer" className="hidden font-sans text-xs text-neutral-500 hover:text-neutral-900 sm:inline">
            Open in {booking.providerName}
          </a>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900">
            <X size={18} aria-hidden />
          </button>
        </div>
        <iframe src={booking.embedUrl} title={`Book with ${creatorName} on ${booking.providerName}`} className="min-h-0 w-full flex-1 border-0" allow="payment" referrerPolicy="strict-origin-when-cross-origin" />
      </div>
    </div>,
    document.body,
  );
}
