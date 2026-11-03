"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Lays children out at a fixed design width and scales them to the available width (never
 * up), so detailed illustrations keep their proportions on phones instead of squashing.
 */
export function ScaleToFit({ width, children }: { width: number; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ scale: number; height: number | undefined }>({ scale: 1, height: undefined });

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const fit = () => {
      const scale = Math.min(1, o.clientWidth / width);
      setBox({ scale, height: i.offsetHeight * scale });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [width]);

  return (
    // min-w-0 + overflow-hidden: the fixed-width inner must never set this box's (or a grid
    // item's) minimum width, or it pushes the page wider than the screen.
    <div ref={outer} className="w-full min-w-0 overflow-hidden" style={{ height: box.height }}>
      <div ref={inner} className="origin-top-left" style={{ width, transform: `scale(${box.scale})` }}>
        {children}
      </div>
    </div>
  );
}
