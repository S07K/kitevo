"use client";

import { useEffect, useState } from "react";

// Launch promo bar. Auto-hides after the promo ends (matches the PRODUCTHUNT coupon's
// Sep 21 expiry) and stays dismissed per browser. Drives the CSS var `--ph-banner`, which
// MarketingNav (top offset) and the landing <main> (padding) read, so the layout shifts
// down while the bar is showing and snaps back when it is dismissed or expired.
const PROMO_END = new Date("2026-09-22T00:00:00+05:30");
const PH_URL = "https://www.producthunt.com/products/kitevo";
const DISMISS_KEY = "kitevo-ph-banner-dismissed";
const BAR_H = "42px";

function setVar(v: string) {
  document.documentElement.style.setProperty("--ph-banner", v);
}

export function LaunchBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // private mode / blocked storage: treat as not dismissed
    }
    const active = Date.now() < PROMO_END.getTime() && !dismissed;
    setShow(active);
    setVar(active ? BAR_H : "0px");
    return () => setVar("0px");
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
    setVar("0px");
    setShow(false);
  };

  return (
    <div
      className="bg-foreground text-background fixed inset-x-0 top-0 z-[60] flex h-[42px] items-center justify-center gap-3 px-4 text-sm"
      role="region"
      aria-label="Launch announcement"
    >
      <a
        href={PH_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring inline-flex items-center gap-2 rounded-sm font-medium hover:opacity-80"
      >
        <span className="hidden sm:inline">Live on Product Hunt.</span>
        <span>
          3 months of Pro free with code{" "}
          <span className="bg-background/15 rounded px-1.5 py-0.5 font-semibold tracking-wide">
            PRODUCTHUNT
          </span>
        </span>
        <span aria-hidden>&rarr;</span>
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="focus-ring text-background/70 hover:text-background absolute right-3 flex h-6 w-6 items-center justify-center rounded-full text-base leading-none"
      >
        &times;
      </button>
    </div>
  );
}
