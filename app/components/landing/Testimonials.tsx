"use client";

import { SectionHeading } from "@/components/section-heading";
import { useReducedMotion } from "@/lib/motion";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  followers: string;
  initials: string;
  color: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I sent my Media Kit Pro link to three brands in one week. Two replied the same day. My old PDF got zero responses in a month.",
    name: "Natalie Rose",
    role: "Lifestyle creator · Instagram",
    followers: "182K followers",
    initials: "NR",
    color: "#d4a574",
  },
  {
    quote:
      "The engagement rate and demographic breakdown on my kit is exactly what brand managers ask for in every outreach email. Now it's just there.",
    name: "Alex Chen",
    role: "Tech & finance creator",
    followers: "94K followers",
    initials: "AC",
    color: "#7c9cbc",
  },
  {
    quote:
      "Switched from a Canva template I'd been using for two years. The live Instagram stats alone make it worth it — brands can see everything is real.",
    name: "Sara Amir",
    role: "Food & travel creator",
    followers: "340K followers",
    initials: "SA",
    color: "#c4956a",
  },
  {
    quote:
      "As a micro-influencer I always felt like I needed to over-explain my value. Now my kit does that for me. Closed my first deal at 22K followers.",
    name: "Jordan Miles",
    role: "Fitness & wellness creator",
    followers: "22K followers",
    initials: "JM",
    color: "#8fbc8f",
  },
  {
    quote:
      "I'm a photographer who works with creators. Every one of my clients who uses Media Kit Pro lands better collaborations. It looks like a real agency pitch.",
    name: "Priya Nair",
    role: "Brand photographer",
    followers: "Works with 50+ creators",
    initials: "PN",
    color: "#b39ddb",
  },
  {
    quote:
      "The Noir vibe matches my streetwear brand perfectly. Brands DM me saying my kit looks more professional than agencies they've worked with.",
    name: "Marcus Webb",
    role: "Streetwear & culture creator",
    followers: "211K followers",
    initials: "MW",
    color: "#e0c070",
  },
];

const COLUMNS: number[][] = [[0, 3], [1, 4], [2, 5]];

function QuoteCard({ t }: { t: Testimonial }): ReactNode {
  return (
    <figure className="border-border bg-background flex flex-col gap-6 rounded-3xl border p-7">
      <blockquote className="text-foreground text-base leading-relaxed font-medium tracking-tight">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <figcaption className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: t.color }}
        >
          {t.initials}
        </div>
        <div>
          <p className="text-foreground text-sm font-medium">{t.name}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">{t.role}</p>
          <p className="text-muted-foreground text-xs">{t.followers}</p>
        </div>
      </figcaption>
    </figure>
  );
}

export function Testimonials(): ReactNode {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const yLeft = useTransform(scrollYProgress, [0, 1], [32, -56]);
  const yMiddle = useTransform(scrollYProgress, [0, 1], [96, -20]);
  const yRight = useTransform(scrollYProgress, [0, 1], [56, -80]);
  const columnY = [yLeft, yMiddle, yRight];

  return (
    <section
      ref={sectionRef}
      id="reviews"
      className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-32 lg:px-10"
    >
      <SectionHeading
        label="Creator stories"
        title="Creators who went from pitching to closing"
        description="Real results from influencers who replaced their PDF decks with Media Kit Pro."
      />

      {reduce ? (
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <QuoteCard key={t.name} t={t} />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:hidden">
            {TESTIMONIALS.map((t) => (
              <QuoteCard key={t.name} t={t} />
            ))}
          </div>
          <div className="mt-16 hidden grid-cols-3 gap-4 lg:grid">
            {COLUMNS.map((column, i) => (
              <motion.div
                key={column.join("-")}
                style={{ y: columnY[i] }}
                className="flex flex-col gap-4"
              >
                {column.map((idx) => {
                  const t = TESTIMONIALS[idx];
                  if (!t) return null;
                  return <QuoteCard key={t.name} t={t} />;
                })}
              </motion.div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
