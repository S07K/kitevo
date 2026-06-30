import { InView } from "@/lib/motion";
import { SectionHeading } from "@/components/section-heading";
import type { ReactNode } from "react";

const STEPS = [
  {
    number: "01",
    title: "Create your profile",
    description:
      "Sign up and fill in your creator profile — name, bio, niche, and social links. Takes under two minutes.",
  },
  {
    number: "02",
    title: "Connect your platforms",
    description:
      "Link Instagram and YouTube. We pull follower counts, engagement rate, audience demographics, and recent content automatically — always live.",
  },
  {
    number: "03",
    title: "Share your kit link",
    description:
      "Your media kit lives at a clean URL. Send it to brands, add it to your bio, or paste it into any pitch email.",
  },
];

export function HowItWorks(): ReactNode {
  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-32 lg:px-10"
    >
      <SectionHeading
        label="How it works"
        title="From sign-up to sent pitch in minutes"
        description="No design skills. No expensive agency. Just a link that makes brands say yes."
        align="center"
      />

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <InView
            key={step.number}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
          >
            <div className="border-border rounded-3xl border p-8">
              <span className="text-muted-foreground text-sm font-medium tabular-nums">
                {step.number}
              </span>
              <h3 className="text-foreground mt-4 text-xl font-medium tracking-tight">
                {step.title}
              </h3>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          </InView>
        ))}
      </div>
    </section>
  );
}
