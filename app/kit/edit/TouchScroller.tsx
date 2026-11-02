"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A scroll area that behaves like a phone screen under a mouse: click-and-drag scrolls the
 * content 1:1 with the pointer (scale-corrected when the phone is drawn smaller than life),
 * a flick keeps gliding with momentum, and a translucent "fingertip" replaces the cursor.
 * Real touch input uses native scrolling; the wheel keeps working.
 *
 * The content is `inert`: links, buttons and focus inside the preview never fire, so taps
 * only ever scroll.
 */
export function TouchScroller({ children, scale = 1, className = "" }: { children: ReactNode; scale?: number; className?: string }) {
  const outer = useRef<HTMLDivElement>(null); // receives pointers, hosts the fingertip
  const box = useRef<HTMLDivElement>(null); // the scrolling area
  const drag = useRef<{ id: number; y: number; top: number; t: number; v: number } | null>(null);
  const raf = useRef<number | null>(null);
  const [finger, setFinger] = useState<{ x: number; y: number; down: boolean } | null>(null);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  /** Pointer position in the content's own (unscaled) pixels. */
  const local = (e: React.PointerEvent) => {
    const r = outer.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };

  const stopGlide = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
  };

  const glide = (velocity: number) => {
    if (reduceMotion.current) return;
    let v = velocity; // content px per ms
    let last = performance.now();
    const step = (now: number) => {
      const el = box.current;
      if (!el) return;
      const dt = now - last;
      last = now;
      el.scrollTop -= v * dt;
      v *= Math.pow(0.94, dt / 16); // ~6% friction per frame
      const atEdge = el.scrollTop <= 0 || el.scrollTop + el.clientHeight >= el.scrollHeight;
      if (Math.abs(v) > 0.02 && !atEdge) raf.current = requestAnimationFrame(step);
      else raf.current = null;
    };
    raf.current = requestAnimationFrame(step);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch" || e.button !== 0 || !box.current) return; // touch: native scroll
    stopGlide();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    drag.current = { id: e.pointerId, y: p.y, top: box.current.scrollTop, t: performance.now(), v: 0 };
    setFinger({ x: p.x, y: p.y, down: true });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const p = local(e);
    setFinger((f) => ({ x: p.x, y: p.y, down: f?.down ?? false }));
    const d = drag.current;
    if (!d || d.id !== e.pointerId || !box.current) return;
    const now = performance.now();
    const prevTop = box.current.scrollTop;
    box.current.scrollTop = d.top - (p.y - d.y);
    const dt = Math.max(1, now - d.t);
    // Smoothed velocity in content px/ms (positive = finger moving down = content up).
    d.v = 0.8 * ((prevTop - box.current.scrollTop) / dt) + 0.2 * d.v;
    d.t = now;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setFinger((f) => (f ? { ...f, down: false } : f));
    if (performance.now() - d.t < 80) glide(d.v); // only flick if the pointer was still moving
  };

  return (
    <div
      ref={outer}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={(e) => {
        if (!drag.current) setFinger(null);
        if (e.pointerType !== "touch" && drag.current?.id === e.pointerId) endDrag(e);
      }}
      onWheel={stopGlide}
      className={`relative h-full w-full cursor-none select-none overflow-hidden ${className}`}
    >
      <div ref={box} className="h-full w-full overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div inert>{children}</div>
      </div>
      {finger && (
        <span
          aria-hidden
          className="pointer-events-none absolute z-[200] rounded-full border border-white/70 bg-black/25 shadow-[0_0_0_1px_rgba(0,0,0,0.15)] transition-[width,height,margin] duration-100"
          style={{
            top: finger.y,
            left: finger.x,
            width: finger.down ? 30 : 38,
            height: finger.down ? 30 : 38,
            marginLeft: finger.down ? -15 : -19,
            marginTop: finger.down ? -15 : -19,
          }}
        />
      )}
    </div>
  );
}
