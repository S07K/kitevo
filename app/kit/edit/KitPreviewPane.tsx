"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Monitor, Pencil, Smartphone } from "lucide-react";
import { Skeleton } from "@/app/components/Skeleton";
import { Iphone } from "@/components/ui/iphone";
import { LiveKit, type KitPreviewData } from "./LiveKit";
import { TouchScroller } from "./TouchScroller";
import { EDITOR_TARGET, EDIT_SECTION_EVENT, type KitDraft } from "./KitEditor";
import type { KitSectionKind } from "@/app/kit/[username]/MediaKitClient";

type Device = "mobile" | "desktop";

/** Viewport the mobile preview renders at (iPhone 14/15 class) and the Iphone frame's full size. */
const VIEWPORT = { w: 390, h: 844 };
const FRAME = { w: 433, h: 882 };
const DEVICE_KEY = "kitevo-editor-preview-device";
const DEVICE_EVENT = "kitevo:preview-device";

/**
 * The saved Mobile/Desktop choice as an external store: the server snapshot (and so the
 * first client render) is always "mobile", and React switches to the saved value after
 * hydration, so a saved "desktop" never causes a hydration mismatch.
 */
const deviceStore = {
  subscribe(cb: () => void) {
    window.addEventListener("storage", cb);
    window.addEventListener(DEVICE_EVENT, cb);
    return () => {
      window.removeEventListener("storage", cb);
      window.removeEventListener(DEVICE_EVENT, cb);
    };
  },
  get(): Device {
    try {
      return localStorage.getItem(DEVICE_KEY) === "desktop" ? "desktop" : "mobile";
    } catch {
      return "mobile";
    }
  },
  set(d: Device) {
    try {
      localStorage.setItem(DEVICE_KEY, d);
    } catch {
      /* storage blocked: the choice just won't persist */
    }
    window.dispatchEvent(new Event(DEVICE_EVENT));
  },
};

/**
 * The editor's preview column. Renders the real kit component (not an iframe) from the
 * draft, so it updates as the creator types. Mobile puts it at a real 390×844 viewport
 * inside the Magic UI iPhone, scaled to fit; Desktop gives it the pane's full width. The kit
 * uses container queries, so it lays out for whichever width it's given. Both are touch
 * areas: drag to scroll, taps never navigate.
 */
export function KitPreviewPane({ data, draft, error }: { data: KitPreviewData | null; draft: KitDraft | null; error?: string | null }) {
  const device = useSyncExternalStore(deviceStore.subscribe, deviceStore.get, () => "mobile" as Device);
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const choose = (d: Device) => deviceStore.set(d);

  // Click-to-edit: the smallest kit section under the pointer (sections nest, e.g. rates in the profile rail).
  const [hover, setHover] = useState<{ top: number; left: number; width: number; height: number; label: string } | null>(null);
  const sectionAt = useCallback((x: number, y: number) => {
    const root = stage.current;
    if (!root) return null;
    let best: HTMLElement | null = null;
    let bestArea = Infinity;
    root.querySelectorAll<HTMLElement>("[data-kit-section]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom && r.width * r.height < bestArea) {
        best = el;
        bestArea = r.width * r.height;
      }
    });
    return best as HTMLElement | null;
  }, []);
  const onHover = useCallback(
    (pt: { x: number; y: number } | null) => {
      const root = stage.current;
      const el = pt ? sectionAt(pt.x, pt.y) : null;
      const target = el ? EDITOR_TARGET[el.dataset.kitSection as KitSectionKind] : null;
      if (!root || !el || !target) return setHover(null);
      const s = root.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      // Clip to the visible scroll area so the outline never spills over the phone frame.
      const view = root.querySelector("[data-touch-scroller]")?.getBoundingClientRect() ?? s;
      const top = Math.max(r.top, view.top) - 4;
      const bottom = Math.min(r.bottom, view.bottom) + 4;
      const left = Math.max(r.left, view.left) - 4;
      const right = Math.min(r.right, view.right) + 4;
      setHover({ top: top - s.top, left: left - s.left, width: right - left, height: bottom - top, label: target.label });
    },
    [sectionAt],
  );
  const onTap = useCallback(
    (x: number, y: number) => {
      const el = sectionAt(x, y);
      const target = el ? EDITOR_TARGET[el.dataset.kitSection as KitSectionKind] : null;
      if (target) window.dispatchEvent(new CustomEvent(EDIT_SECTION_EVENT, { detail: { section: target.section, row: target.row } }));
    },
    [sectionAt],
  );

  // Fit the phone into the stage (never upscale past 1:1).
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el || device !== "mobile") return;
    const fit = () => {
      const { width, height } = el.getBoundingClientRect();
      setScale(Math.max(0.4, Math.min(1, (height - 48) / FRAME.h, (width - 48) / FRAME.w)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [device]);

  const seg = (on: boolean) =>
    `inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${
      on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    }`;

  const kit = data && draft ? <LiveKit data={data} draft={draft} /> : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-5 py-2.5">
        <div className="flex rounded-full bg-muted p-0.5" role="radiogroup" aria-label="Preview size">
          <button type="button" role="radio" aria-checked={device === "mobile"} onClick={() => choose("mobile")} className={seg(device === "mobile")}>
            <Smartphone size={13} aria-hidden /> Mobile
          </button>
          <button type="button" role="radio" aria-checked={device === "desktop"} onClick={() => choose("desktop")} className={seg(device === "desktop")}>
            <Monitor size={13} aria-hidden /> Desktop
          </button>
        </div>
        <span className="text-xs text-muted-foreground">Click any part to edit it. Drag to scroll.</span>
      </div>

      <div ref={stage} className="relative min-h-0 flex-1 overflow-hidden">
        {error ? (
          <p role="alert" className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        ) : !kit ? (
          <Skeleton className="absolute inset-6 rounded-2xl" />
        ) : device === "desktop" ? (
          // translateZ makes this box the containing block for the kit's position:fixed header,
          // so it pins to the top of the preview instead of the browser window.
          <div className="absolute inset-0" style={{ transform: "translateZ(0)" }}>
            <TouchScroller onTap={onTap} onHover={onHover}>{kit}</TouchScroller>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Iphone style={{ width: FRAME.w * scale }} className="drop-shadow-[0_24px_40px_rgba(27,54,93,0.25)]">
              {/* Real 390×844 viewport, scaled with the phone. The transform also anchors the
                  kit's fixed header to the phone screen. */}
              <div className="origin-top-left" style={{ width: VIEWPORT.w, height: VIEWPORT.h, transform: `scale(${scale})` }}>
                <TouchScroller scale={scale} onTap={onTap} onHover={onHover}>{kit}</TouchScroller>
              </div>
            </Iphone>
          </div>
        )}
        {hover && kit && !error && (
          <div
            aria-hidden
            className="pointer-events-none absolute z-10 rounded-2xl ring-2 ring-primary/80"
            style={{ top: hover.top, left: hover.left, width: hover.width, height: hover.height }}
          >
            <span className="absolute -top-3 left-3 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-sm">
              <Pencil size={11} aria-hidden /> {hover.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
