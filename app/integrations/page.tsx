import type { Metadata } from "next";
import Link from "next/link";
import { BlogHeader, BlogFooter } from "@/app/blog/BlogChrome";
import { IntegrationLogo } from "@/app/components/IntegrationLogo";
import { INTEGRATION_GROUPS, type Integration } from "@/lib/integrations";

export const metadata: Metadata = {
  title: "Integrations: Instagram, YouTube, Razorpay and more · Kitevo",
  description:
    "What Kitevo connects to: live Instagram and YouTube stats on your media kit, paid products through your own Razorpay account, file delivery from Google Drive, Dropbox or Notion, and your own domain.",
  alternates: { canonical: "/integrations" },
};

function Card({ it }: { it: Integration }) {
  const soon = it.status === "soon";
  return (
    <article className={`flex h-full flex-col rounded-[24px] border border-border bg-background p-6 ${soon ? "opacity-80" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <IntegrationLogo id={it.id} />
        {soon ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">Coming soon</span>
        ) : (
          <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary-soft-foreground">{it.plans}</span>
        )}
      </div>
      <h3 className="mt-5 text-lg font-medium text-foreground">{it.name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{it.summary}</p>
      <ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-foreground">
        {it.details.map((d) => (
          <li key={d} className="flex gap-2">
            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
            {d}
          </li>
        ))}
      </ul>
      {it.link && (
        <Link href={it.link.href} className="mt-auto pt-5 text-sm font-medium text-primary hover:underline">
          {it.link.label}
        </Link>
      )}
    </article>
  );
}

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <BlogHeader width="5xl" />
      <main className="mx-auto max-w-5xl px-5 pb-8 pt-12 sm:px-8 sm:pt-20">
        <h1 className="max-w-2xl text-balance text-[clamp(30px,5vw,52px)] font-medium leading-[1.06] tracking-tight text-foreground">
          Works with the accounts you already have
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          Kitevo pulls your real numbers from Instagram and YouTube, takes payments into your own Razorpay account, and delivers files from wherever you keep them.
        </p>
        <nav aria-label="Integration groups" className="mt-8 flex flex-wrap gap-2">
          {INTEGRATION_GROUPS.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="rounded-full border border-border bg-background px-3.5 py-1.5 text-sm text-foreground hover:border-primary">
              {g.title}
            </a>
          ))}
        </nav>

        {INTEGRATION_GROUPS.map((g) => (
          <section key={g.id} id={g.id} className="mt-16 scroll-mt-24">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">{g.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{g.intro}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((it) => (
                <Card key={it.name} it={it} />
              ))}
            </div>
          </section>
        ))}

        <section className="mt-20 rounded-[28px] bg-primary px-6 py-10 text-center text-primary-foreground sm:px-10">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Connect your accounts in a couple of minutes</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed opacity-90">Start free with numbers you add yourself; switch on live stats and paid products with Starter or Pro.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="inline-flex h-11 items-center rounded-full bg-primary-foreground px-6 text-sm font-semibold text-primary hover:opacity-90">Create your kit</Link>
            <Link href="/#pricing" className="inline-flex h-11 items-center rounded-full border border-primary-foreground/40 px-6 text-sm font-semibold hover:bg-primary-foreground/10">See plans</Link>
          </div>
        </section>
      </main>
      <BlogFooter width="5xl" />
    </div>
  );
}
