"use client";

import { InView, useReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useState, useEffect, type ReactNode } from "react";

type Vibe = {
  id: string;
  name: string;
  tagline: string;
  for: string;
  bg: string;
  fg: string;
  accent: string;
  accentFg: string;
  secondaryBg: string;
};

const VIBES: Vibe[] = [
  {
    id: "editorial",
    name: "Editorial",
    tagline: "Magazine-luxe. Vogue energy.",
    for: "Fashion · Beauty · Lifestyle",
    bg: "#111110",
    fg: "#f5f0e8",
    accent: "#f5f0e8",
    accentFg: "#111110",
    secondaryBg: "#1e1e1c",
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Creative agency portfolio.",
    for: "Design · Tech · Thought leaders",
    bg: "#f0eeeb",
    fg: "#2d2d2b",
    accent: "#2d2d2b",
    accentFg: "#f0eeeb",
    secondaryBg: "#e4e2de",
  },
  {
    id: "noir",
    name: "Noir",
    tagline: "Dark, cinematic, premium.",
    for: "Music · Streetwear · High-end",
    bg: "#1a1a18",
    fg: "#e8e6e0",
    accent: "#c9a84c",
    accentFg: "#1a1a18",
    secondaryBg: "#252523",
  },
  {
    id: "bloom",
    name: "Bloom",
    tagline: "Warm, organic, approachable.",
    for: "Food · Wellness · Travel",
    bg: "#fdf6ef",
    fg: "#4a2c1a",
    accent: "#c97b4b",
    accentFg: "#fdf6ef",
    secondaryBg: "#f5ece0",
  },
  {
    id: "electric",
    name: "Electric",
    tagline: "High energy, Gen-Z native.",
    for: "Gaming · Sports · Youth culture",
    bg: "#0a0a14",
    fg: "#eeeeff",
    accent: "#6366f1",
    accentFg: "#eeeeff",
    secondaryBg: "#12121f",
  },
];

function KitPreview({ vibe }: { vibe: Vibe }): ReactNode {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-2xl"
      style={{ backgroundColor: vibe.bg }}
    >
      {/* Header strip */}
      <div className="flex items-center justify-between px-5 py-4" style={{ backgroundColor: vibe.secondaryBg }}>
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-full" style={{ backgroundColor: vibe.accent, opacity: 0.9 }} />
          <div>
            <div className="h-1.5 w-16 rounded-full mb-1" style={{ backgroundColor: vibe.fg, opacity: 0.7 }} />
            <div className="h-1 w-10 rounded-full" style={{ backgroundColor: vibe.fg, opacity: 0.3 }} />
          </div>
        </div>
        <div
          className="rounded-full px-3 py-1 text-[9px] font-bold tracking-wider uppercase"
          style={{ backgroundColor: vibe.accent, color: vibe.accentFg }}
        >
          {vibe.name}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px px-4 py-4" style={{ backgroundColor: `${vibe.fg}08` }}>
        {[["245K", "followers"], ["4.8%", "engagement"], ["12M", "reach"]].map(([val, lbl]) => (
          <div key={lbl} className="flex flex-col items-center py-2.5 rounded-lg" style={{ backgroundColor: `${vibe.fg}06` }}>
            <span className="text-sm font-semibold" style={{ color: vibe.accent }}>{val}</span>
            <span className="text-[8px] mt-0.5 font-medium uppercase tracking-wider" style={{ color: vibe.fg, opacity: 0.45 }}>{lbl}</span>
          </div>
        ))}
      </div>

      {/* Content strips */}
      <div className="flex-1 space-y-2.5 px-4 pb-4 pt-2">
        {[0.5, 0.35, 0.25].map((opacity, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full"
            style={{ backgroundColor: vibe.fg, opacity, width: `${80 - i * 15}%` }}
          />
        ))}

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="aspect-video rounded-lg" style={{ backgroundColor: `${vibe.fg}12` }} />
          ))}
        </div>
      </div>

      {/* CTA strip */}
      <div className="px-4 pb-4">
        <div
          className="flex h-8 items-center justify-center rounded-lg text-[10px] font-semibold tracking-wide"
          style={{ backgroundColor: vibe.accent, color: vibe.accentFg }}
        >
          Collab with me
        </div>
      </div>
    </div>
  );
}

export function VibesShowcase(): ReactNode {
  const [active, setActive] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const vibe = VIBES[active]!;

  // Below lg the selector list is hidden (it was a cramped horizontal scroll), so the
  // preview auto-advances through the vibes instead. Desktop stays click-to-select.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (isDesktop || prefersReducedMotion) return;
    const id = setInterval(() => setActive((a) => (a + 1) % VIBES.length), 3800);
    return () => clearInterval(id);
  }, [isDesktop, prefersReducedMotion]);

  return (
    <section
      id="vibes"
      className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-32 lg:px-10"
    >
      {/* Header */}
      <InView className="mb-12 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-[0.18em] uppercase">
            Pro · Brand Kit Vibes
          </p>
          <h2 className="text-foreground text-[clamp(28px,4vw,48px)] font-medium leading-[1.08] tracking-tight text-balance">
            Five signatures. One that&apos;s yours.
          </h2>
          <p className="text-muted-foreground mt-4 max-w-lg text-base leading-relaxed">
            Every Pro kit comes with full visual identity control — pick a vibe, customize the palette, and make it unmistakably you.
          </p>
        </div>
      </InView>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr] lg:gap-10">
        {/* Vibe selector — desktop only; mobile auto-advances and shows a caption below */}
        <div className="hidden gap-3 lg:flex lg:flex-col">
          {VIBES.map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "focus-ring group shrink-0 rounded-2xl px-5 py-4 text-left transition-all duration-200",
                active === i
                  ? "ring-foreground bg-background shadow-sm ring-2"
                  : "bg-background/50 border-border border hover:border-foreground/20"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full border border-black/10 shrink-0"
                  style={{ backgroundColor: v.bg === "#f0eeeb" || v.bg === "#fdf6ef" ? v.bg : v.bg }}
                />
                <span className={cn(
                  "text-sm font-semibold",
                  active === i ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}>
                  {v.name}
                </span>
              </div>
              <p className={cn(
                "mt-1.5 text-xs leading-relaxed",
                active === i ? "text-muted-foreground" : "text-muted-foreground/60"
              )}>
                {v.tagline}
              </p>
              {active === i && (
                <p className="text-muted-foreground mt-1 text-[10px] font-medium uppercase tracking-wider">
                  {v.for}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Kit preview — right column */}
        <div>
          <div className="aspect-4/3 overflow-hidden rounded-3xl shadow-xl lg:aspect-auto lg:min-h-[420px]">
            <div className="h-full">
              <KitPreview vibe={vibe} />
            </div>
          </div>

          {/* Mobile caption — carries the name/tagline that used to live in the selector */}
          <div className="mt-5 flex flex-col items-center gap-1.5 text-center lg:hidden">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: vibe.bg }}
              />
              <span className="text-foreground text-sm font-semibold">{vibe.name}</span>
            </div>
            <p className="text-muted-foreground text-xs">{vibe.tagline}</p>
            <p className="text-muted-foreground/70 text-[10px] font-medium tracking-wider uppercase">
              {vibe.for}
            </p>
            <div className="mt-2 flex items-center gap-1.5" aria-hidden>
              {VIBES.map((v, i) => (
                <span
                  key={v.id}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    i === active ? "bg-primary w-5" : "bg-border w-1.5"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pro badge — shrink-0 + nowrap, or the pill collapses and wraps to two lines */}
      <InView className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div className="bg-primary text-primary-foreground inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide">
          Pro feature
        </div>
        <p className="text-muted-foreground text-sm text-pretty">
          Vibe customization comes with Pro, along with your own colour palette, fonts, logo, and a brand inquiry form.
        </p>
      </InView>
    </section>
  );
}
