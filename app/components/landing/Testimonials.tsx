"use client";

import { SectionHeading } from "@/components/section-heading";
import { useReducedMotion } from "@/lib/motion";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

type ProductOutcome = {
  tag: string;
  title: string;
  body: string;
};

/**
 * Product outcomes, not testimonials.
 *
 * Every claim here maps to something the product does today. We do not invent creators,
 * follower counts, or quotes — trust is the product, and fake proof would undermine it.
 */
const OUTCOMES: ProductOutcome[] = [
  {
    tag: "Live proof",
    title: "Stats brands can verify",
    body:
      "Connect Instagram or YouTube and your kit pulls the latest followers, engagement, and views. No screenshots to update before every pitch.",
  },
  {
    tag: "Free plan",
    title: "Start before you spend",
    body:
      "One kit, manual stats, and brand partners. Publish a credible page before paying anything.",
  },
  {
    tag: "One link",
    title: "A pitch that travels well",
    body:
      "Send one URL to a brand. It opens fast, looks sharp on mobile, and answers the questions a static PDF can't.",
  },
  {
    tag: "Multi-kit",
    title: "Different lanes, same dashboard",
    body:
      "Pro creators can publish up to three kits for different niches, offers, or audiences — without buying another tool.",
  },
  {
    tag: "Pipeline",
    title: "Inquiries become deals",
    body:
      "Every brand message lands in a pipeline, so follow-ups don't disappear in your DMs.",
  },
  {
    tag: "Roadmap",
    title: "Built to grow into commerce",
    body:
      "Digital products, bookings, and brand deal rooms are next. Your kit stays the front door.",
  },
];

const COLUMNS: number[][] = [[0, 3], [1, 4], [2, 5]];

function OutcomeCard({ outcome }: { outcome: ProductOutcome }): ReactNode {
  return (
    <article className="border-border bg-background flex flex-col gap-4 rounded-3xl border p-7">
      <span className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">
        {outcome.tag}
      </span>
      <div>
        <h3 className="font-display text-foreground text-lg font-semibold tracking-tight">
          {outcome.title}
        </h3>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{outcome.body}</p>
      </div>
    </article>
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
      id="why-kitevo"
      className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-32 lg:px-10"
    >
      <SectionHeading
        label="Why Kitevo"
        title="Built for the way brand deals actually happen"
        description="Kitevo is early. Instead of rented testimonials, here is exactly what the product does today — and what it is being built to do next."
      />

      {reduce ? (
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OUTCOMES.map((outcome) => (
            <OutcomeCard key={outcome.title} outcome={outcome} />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:hidden">
            {OUTCOMES.map((outcome) => (
              <OutcomeCard key={outcome.title} outcome={outcome} />
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
                  const outcome = OUTCOMES[idx];
                  if (!outcome) return null;
                  return <OutcomeCard key={outcome.title} outcome={outcome} />;
                })}
              </motion.div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
