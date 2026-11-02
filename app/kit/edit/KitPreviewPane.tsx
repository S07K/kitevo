"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Skeleton } from "@/app/components/Skeleton";
import { Iphone } from "@/components/ui/iphone";

type Device = "mobile" | "desktop";

/** Viewport the mobile preview renders at (iPhone 14/15 class) and the Iphone frame's full size. */
const VIEWPORT = { w: 390, h: 844 };
const FRAME = { w: 433, h: 882 };
const DEVICE_KEY = "kitevo-editor-preview-device";

/**
 * Stack of iframes for the kit preview. A saved change loads the new version into a hidden
 * iframe and swaps it in once it has painted, so the preview never flashes blank.
 */
function Frames({ slug, version }: { slug: string; version: number }) {
  const [frames, setFrames] = useState<Array<{ v: number; ready: boolean }>>([{ v: version, ready: false }]);
  const [seenVersion, setSeenVersion] = useState(version);
  const refs = useRef(new Map<number, HTMLIFrameElement>());

  // A new saved version: add a hidden frame for it (React's "adjust state on prop change"
  // pattern, during render rather than in an effect).
  if (version !== seenVersion) {
    setSeenVersion(version);
    setFrames((fs) => (fs.some((f) => f.v === version) ? fs : [...fs, { v: version, ready: false }]));
  }

  const onLoad = (v: number) =>
    setFrames((fs) => {
      const next = fs.map((f) => (f.v === v ? { ...f, ready: true } : f));
      const newestReady = Math.max(...next.filter((f) => f.ready).map((f) => f.v));
      return next.filter((f) => f.v >= newestReady); // drop older frames once a newer one is ready
    });

  const visible = Math.max(-1, ...frames.filter((f) => f.ready).map((f) => f.v));

  return (
    <div className="relative h-full w-full overflow-hidden">
      {visible === -1 && <Skeleton className="absolute inset-0 rounded-none" />}
      {frames.map((f) => (
        <iframe
          key={f.v}
          ref={(el) => {
            if (el) refs.current.set(f.v, el);
            else refs.current.delete(f.v);
          }}
          src={`/kit/${slug}?preview=1&v=${f.v}`}
          title="Kit preview"
          onLoad={() => onLoad(f.v)}
          className={`pointer-events-none absolute inset-0 h-full w-full border-0 bg-white transition-opacity duration-200 ${
            f.v === visible ? "opacity-100" : "opacity-0"
          }`}
          tabIndex={-1}
          aria-hidden={f.v !== visible}
        />
      ))}
      {/* Scroll the preview without letting clicks navigate inside it. */}
      <div
        className="absolute inset-0"
        onWheel={(e) => refs.current.get(visible)?.contentWindow?.scrollBy({ top: e.deltaY, behavior: "instant" })}
        aria-hidden
      />
    </div>
  );
}

/**
 * The editor's preview column: a Desktop / Mobile switch and the live kit. Mobile renders the
 * kit at a real 390×844 phone viewport inside the Magic UI iPhone frame, scaled to fit the column,
 * so the creator sees the layout brands get on their phones.
 */
export function KitPreviewPane({ slug, version }: { slug: string | null; version: number }) {
  // Rendered client-side only (inside the editor's useSearchParams Suspense boundary), so
  // reading the saved choice during the first render can't cause a hydration mismatch.
  const [device, setDevice] = useState<Device>(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem(DEVICE_KEY) : null;
      return saved === "desktop" ? "desktop" : "mobile";
    } catch {
      return "mobile";
    }
  });
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const choose = (d: Device) => {
    setDevice(d);
    try {
      localStorage.setItem(DEVICE_KEY, d);
    } catch {
      /* ignore */
    }
  };

  // Fit the phone into the stage (never upscale past 1:1).
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el || device !== "mobile") return;
    const fit = () => {
      const { width, height } = el.getBoundingClientRect();
      const s = Math.min(1, (height - 48) / FRAME.h, (width - 48) / FRAME.w);
      setScale(Math.max(0.4, s));
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
        <span className="text-xs text-muted-foreground">Updates after each save</span>
      </div>

      <div ref={stage} className="relative min-h-0 flex-1 overflow-hidden">
        {!slug ? (
          <Skeleton className="absolute inset-6 rounded-2xl" />
        ) : device === "desktop" ? (
          <Frames slug={slug} version={version} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Magic UI Iphone (components/ui/iphone.tsx) sized to the stage. The kit renders at a
                real 390×844 viewport inside the screen, scaled with the phone. */}
            <Iphone style={{ width: FRAME.w * scale }} className="drop-shadow-[0_24px_40px_rgba(27,54,93,0.25)]">
              <div className="origin-top-left" style={{ width: VIEWPORT.w, height: VIEWPORT.h, transform: `scale(${scale})` }}>
                <Frames slug={slug} version={version} />
              </div>
            </Iphone>
          </div>
        )}
      </div>
    </div>
  );
}
