"use client";

import Link from "next/link";
import { APP_HOST } from "@/lib/app-url";
import { SectionHeading } from "@/components/section-heading";
import { softEase, useReducedMotion } from "@/lib/motion";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { REFERRAL_RATE_PCT, REFERRAL_TERMS } from "@/lib/referral-terms";

type QA = { question: string; answer: string | ReactNode };

const FAQS: QA[] = [
  {
    question: "What is a media kit and why do I need one?",
    answer:
      "A media kit is a document you send to brands when pitching for collaborations. It shows your follower count, engagement rate, audience demographics, and what you create. Kitevo turns all of that into a live, professional web page instead of a static PDF — so brands see real-time data and you look serious.",
  },
  {
    question: "How does the Instagram connection work?",
    answer: (
      <>
        We use the official Instagram Graph API. You authorize access through Meta&apos;s secure OAuth flow, and we pull your follower count, engagement rate, recent posts, and audience demographics (age, gender, top locations). We never see your password.{" "}
        <Link href="/help/instagram" className="underline underline-offset-4 hover:opacity-70 transition-opacity">
          Connection troubleshooting guide
        </Link>
      </>
    ),
  },
  {
    question: "What's included in the free plan?",
    answer:
      "The free plan lets you create one media kit with your profile, bio, brand partners, and manually entered stats. You get a shareable link immediately. Upgrading to Starter adds live Instagram and YouTube data; upgrading to Pro adds three kits and the brand inquiry inbox.",
  },
  {
    question: "What makes Pro different from Starter?",
    answer:
      "Pro gives you three media kits (great for different niches or brand verticals), access to the Brand Kit Vibe system (five signature design styles — Editorial, Studio, Noir, Bloom, Electric), and a brand inquiry inbox with a deal pipeline so you can track every conversation from first message to won.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes. Cancel anytime from your dashboard — no questions, no penalty. You'll keep access until the end of your billing period, then revert to the free plan.",
  },
  {
    question: "Can I earn money by referring other creators?",
    answer: `Yes. Every account gets an invite link. When someone signs up with it and pays for a plan, you earn ${REFERRAL_RATE_PCT}% of what they pay for their first ${REFERRAL_TERMS.months} months, paid monthly by PayPal, Wise or bank transfer. See the referral program page for details.`,
  },
  {
    question: "Is my media kit URL permanent?",
    answer:
      `Yes. Your kit URL is based on your username (e.g. ${APP_HOST}/yourname) and remains yours as long as your account is active. You can share it anywhere — bio, emails, DMs — and it always shows your latest data.`,
  },
];

function FaqItem({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: QA;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}): ReactNode {
  const prefersReducedMotion = useReducedMotion();
  const panelId = `faq-panel-${index}`;
  const buttonId = `faq-button-${index}`;

  return (
    <div className="border-border border-t last:border-b">
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="focus-ring flex w-full items-center justify-between gap-6 py-6 text-left"
        >
          <span className="text-foreground text-base font-medium tracking-tight">
            {item.question}
          </span>
          <motion.span
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.01 }
                : { duration: 0.3, ease: softEase }
            }
            className="text-muted-foreground shrink-0 text-xl leading-none font-light"
          >
            +
          </motion.span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.01 }
                : { duration: 0.4, ease: softEase }
            }
            className="overflow-hidden"
          >
            <p className="text-muted-foreground max-w-2xl pb-7 text-sm leading-relaxed">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FaqSection(): ReactNode {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="mx-auto max-w-[1200px] scroll-mt-24 px-6 pb-24 sm:px-10 sm:pb-32"
    >
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <SectionHeading
          label="FAQ"
          title="Honest answers to fair questions"
          description="Still have questions? More answers coming soon."
        />
        <div>
          {FAQS.map((item, i) => (
            <FaqItem
              key={item.question}
              item={item}
              index={i}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex((cur) => (cur === i ? null : i))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
