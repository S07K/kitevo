import type { Metadata } from "next";
import Link from "next/link";
import { BlogHeader, BlogFooter } from "@/app/blog/BlogChrome";
import { CHECKED_ON, COMPARISONS } from "@/lib/comparisons";

export const metadata: Metadata = {
  title: "Kitevo compared: Stan Store, Linktree, Beacons, Canva · Kitevo",
  description: "Honest, sourced comparisons of Kitevo with Stan Store, Linktree, Beacons and Canva media kits, including where each one is the better choice.",
  alternates: { canonical: "/compare" },
};

export default function CompareIndex() {
  return (
    <div className="min-h-screen bg-canvas">
      <BlogHeader />
      <main className="mx-auto max-w-4xl px-5 pt-12 sm:px-8 sm:pt-20">
        <h1 className="max-w-2xl text-balance text-[clamp(30px,5vw,52px)] font-medium leading-[1.06] tracking-tight text-foreground">How Kitevo compares</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          Kitevo is for the brand-deal side of being a creator. Here&apos;s how it lines up against tools creators often use, including where they&apos;re the better pick. Every claim about another product links to its source.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {COMPARISONS.map((c) => (
            <Link key={c.slug} href={`/compare/${c.slug}`} className="group rounded-[24px] border border-border bg-background p-6 transition-colors hover:border-primary">
              <p className="text-lg font-medium text-foreground">
                Kitevo vs {c.name.replace(/^a /, "")} <span className="inline-block transition-transform group-hover:translate-x-0.5" aria-hidden>→</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.name.charAt(0).toUpperCase() + c.name.slice(1)} is {c.whatTheyAre}.</p>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Last checked {CHECKED_ON}.</p>
      </main>
      <BlogFooter />
    </div>
  );
}
