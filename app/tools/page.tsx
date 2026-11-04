import type { Metadata } from "next";
import Link from "next/link";
import { BlogHeader, BlogFooter } from "@/app/blog/BlogChrome";

export const metadata: Metadata = {
  title: "Free tools for creators · Kitevo",
  description: "Free calculators for Instagram, TikTok and YouTube creators: work out what to charge brands and your engagement rate. No sign-up.",
  alternates: { canonical: "/tools" },
};

const TOOLS = [
  {
    href: "/tools/rate-calculator",
    name: "Rate calculator",
    body: "What should you charge for a post, Reel, Story or video? Get a price range for every common deliverable.",
    sample: ["Instagram feed post", "$380–$650"],
  },
  {
    href: "/tools/engagement-rate-calculator",
    name: "Engagement rate calculator",
    body: "Your engagement rate on Instagram, TikTok or YouTube, and how it compares with accounts your size.",
    sample: ["Engagement rate", "3.12%"],
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <BlogHeader width="5xl" />
      <main className="mx-auto max-w-5xl px-5 pt-12 sm:px-8 sm:pt-20">
        <h1 className="max-w-2xl text-[clamp(32px,5.5vw,56px)] font-medium leading-[1.05] tracking-tight text-foreground text-balance">
          Free tools for creators
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          Quick answers to the two questions every brand deal starts with. No sign-up, and every formula is shown.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="group flex flex-col rounded-[28px] border border-border bg-background p-6 transition-colors hover:border-primary sm:p-7">
              <div className="rounded-2xl bg-primary p-5 text-primary-foreground">
                <p className="text-xs text-primary-foreground/75">{t.sample[0]}</p>
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{t.sample[1]}</p>
              </div>
              <h2 className="mt-6 text-xl font-medium text-foreground">
                {t.name} <span className="inline-block transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
            </Link>
          ))}
        </div>
      </main>
      <BlogFooter width="5xl" />
    </div>
  );
}
