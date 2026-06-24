"use client";

import { SectionHeading } from "@/components/section-heading";
import { InView } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";

type Vibe = {
  id: string;
  name: string;
  tagline: string;
  bg: string;
  fg: string;
  accent: string;
  accentFg: string;
  font: string;
  for: string;
};

const VIBES: Vibe[] = [
  {
    id: "editorial",
    name: "Editorial",
    tagline: "Magazine-luxe, Vogue energy",
    bg: "#111110",
    fg: "#f5f0e8",
    accent: "#f5f0e8",
    accentFg: "#111110",
    font: "Georgia, serif",
    for: "Fashion · Beauty · Lifestyle",
  },
  {
    id: "studio",
    name: "Studio",
    tagline: "Creative agency portfolio",
    bg: "#f0eeeb",
    fg: "#2d2d2b",
    accent: "#2d2d2b",
    accentFg: "#f0eeeb",
    font: "system-ui, sans-serif",
    for: "Design · Tech · Thought leaders",
  },
  {
    id: "noir",
    name: "Noir",
    tagline: "Dark, cinematic, premium",
    bg: "#1a1a18",
    fg: "#e8e6e0",
    accent: "#c9a84c",
    accentFg: "#1a1a18",
    font: "Georgia, serif",
    for: "Music · Streetwear · High-end",
  },
  {
    id: "bloom",
    name: "Bloom",
    tagline: "Warm, organic, approachable",
    bg: "#fdf6ef",
    fg: "#4a2c1a",
    accent: "#c97b4b",
    accentFg: "#fdf6ef",
    font: "Georgia, serif",
    for: "Food · Wellness · Travel",
  },
  {
    id: "electric",
    name: "Electric",
    tagline: "High energy, Gen-Z native",
    bg: "#0a0a14",
    fg: "#eeeeff",
    accent: "#6366f1",
    accentFg: "#eeeeff",
    font: "system-ui, sans-serif",
    for: "Gaming · Sports · Youth culture",
  },
];

function VibeCard({ vibe, isActive, onClick }: { vibe: Vibe; isActive: boolean; onClick: () => void }): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex-shrink-0 cursor-pointer rounded-2xl transition-all duration-300 focus-ring",
        isActive ? "w-72 md:w-80" : "w-48 md:w-56"
      )}
      style={{
        backgroundColor: vibe.bg,
        height: 420,
      }}
      aria-label={`View ${vibe.name} vibe`}
    >
      {/* Mock kit content */}
      <div className="flex h-full flex-col justify-between p-6">
        {/* Top: avatar + name */}
        <div className="flex items-start gap-3">
          <div
            className="h-10 w-10 rounded-full opacity-80"
            style={{ backgroundColor: vibe.accent }}
          />
          <div className="flex flex-col gap-1.5 pt-0.5">
            <div
              className="h-2 w-20 rounded-full opacity-60"
              style={{ backgroundColor: vibe.fg }}
            />
            <div
              className="h-1.5 w-14 rounded-full opacity-35"
              style={{ backgroundColor: vibe.fg }}
            />
          </div>
        </div>

        {/* Middle: stats */}
        {isActive && (
          <div className="grid grid-cols-3 gap-2">
            {["245K", "4.8%", "12M"].map((stat, i) => (
              <div
                key={i}
                className="rounded-xl p-3 text-center"
                style={{ backgroundColor: `${vibe.fg}10` }}
              >
                <p
                  className="text-base font-semibold"
                  style={{ color: vibe.accent, fontFamily: vibe.font }}
                >
                  {stat}
                </p>
                <p
                  className="mt-0.5 text-[9px] opacity-50"
                  style={{ color: vibe.fg }}
                >
                  {["followers", "engagement", "reach"][i]}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Bottom: vibe name + CTA */}
        <div>
          <div
            className="mb-3 h-px w-full opacity-15"
            style={{ backgroundColor: vibe.fg }}
          />
          <div className="flex items-end justify-between">
            <div>
              <p
                className="text-lg font-semibold tracking-tight"
                style={{ color: vibe.fg, fontFamily: vibe.font }}
              >
                {vibe.name}
              </p>
              {isActive && (
                <p
                  className="mt-0.5 text-xs opacity-55"
                  style={{ color: vibe.fg }}
                >
                  {vibe.for}
                </p>
              )}
            </div>
            <span
              className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ backgroundColor: vibe.accent, color: vibe.accentFg }}
            >
              Pro
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function VibesShowcase(): ReactNode {
  const [activeVibe, setActiveVibe] = useState("editorial");

  return (
    <section
      id="vibes"
      className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-32 lg:px-10"
    >
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          label="Brand Kit Vibes"
          title="Five signature styles. One that's yours."
          description="Pro subscribers can fully customize their kit's vibe — palette, typography, and layout — to match their brand identity."
        />
        <InView>
          <p className="text-muted-foreground text-sm">
            Tap a card to preview
          </p>
        </InView>
      </div>

      <div className="mt-12 flex gap-3 overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch]">
        {VIBES.map((vibe) => (
          <VibeCard
            key={vibe.id}
            vibe={vibe}
            isActive={activeVibe === vibe.id}
            onClick={() => setActiveVibe(vibe.id)}
          />
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-5">
        {VIBES.map((vibe) => (
          <button
            key={vibe.id}
            type="button"
            onClick={() => setActiveVibe(vibe.id)}
            className={cn(
              "focus-ring rounded-xl px-3 py-2 text-left transition-all",
              activeVibe === vibe.id
                ? "bg-foreground text-background"
                : "border-border border hover:border-foreground/30"
            )}
          >
            <p className="text-sm font-medium">{vibe.name}</p>
            <p
              className={cn(
                "mt-0.5 text-xs",
                activeVibe === vibe.id ? "text-background/60" : "text-muted-foreground"
              )}
            >
              {vibe.tagline}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
