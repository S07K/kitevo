"use client";

import { softEase, useReducedMotion } from "@/lib/motion";
import { motion, useScroll, useTransform, type Variants } from "motion/react";
import Link from "next/link";
import { useRef, type ReactNode } from "react";

const HEADLINE = "Your audience is worth paying for.";
const WORDS = HEADLINE.split(" ");

const WORD_CONTAINER: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const WORD_ITEM: Variants = {
  hidden: { y: "110%" },
  visible: { y: 0, transition: { duration: 0.7, ease: softEase } },
};

export function FinalCta(): ReactNode {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "center center"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);
  const panelY = useTransform(scrollYProgress, [0, 1], [36, 0]);

  return (
    <section
      ref={sectionRef}
      className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-32 lg:px-10"
    >
      <motion.div
        style={{
          backgroundColor: "var(--surface)",
          color: "var(--surface-foreground)",
          ...(reduce ? {} : { scale, y: panelY }),
        }}
        className="flex flex-col items-center overflow-hidden rounded-[40px] px-6 pt-20 pb-24 text-center sm:pt-24 sm:pb-32"
      >

        <h2 className="max-w-2xl text-[clamp(34px,5.5vw,64px)] leading-[1.06] font-medium tracking-tight">
          {reduce ? (
            HEADLINE
          ) : (
            <>
              <span className="sr-only">{HEADLINE}</span>
              <motion.span
                aria-hidden
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={WORD_CONTAINER}
                className="flex flex-wrap justify-center gap-x-[0.25em]"
              >
                {WORDS.map((word, i) => (
                  <span
                    key={`${word}-${i}`}
                    className="-mb-[0.1em] inline-flex overflow-hidden pb-[0.1em]"
                  >
                    <motion.span variants={WORD_ITEM} className="inline-block">
                      {word}
                    </motion.span>
                  </span>
                ))}
              </motion.span>
            </>
          )}
        </h2>

        <p className="mt-6 max-w-md text-base leading-relaxed opacity-60">
          Build your kit, add your rates and start taking brand inquiries today. Free to start, no card needed.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            style={{
              backgroundColor: "var(--surface-foreground)",
              color: "var(--surface)",
            }}
            className="focus-ring inline-flex h-13 items-center rounded-full px-8 text-sm font-medium transition-opacity hover:opacity-80"
          >
            Start earning with Kitevo
          </Link>
          <Link
            href="/pricing"
            className="focus-ring inline-flex h-13 items-center rounded-full border border-current/20 px-8 text-sm font-medium transition-opacity hover:opacity-70"
          >
            View pricing
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
