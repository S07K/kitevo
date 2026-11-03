import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { BlogHeader, BlogFooter } from "@/app/blog/BlogChrome";
import { APP_URL } from "@/lib/app-url";
import { CHECKED_ON, COMPARISONS, UNCONFIRMED, comparisonBySlug, type Source } from "@/lib/comparisons";

export const dynamicParams = false;
export function generateStaticParams() {
  return COMPARISONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = comparisonBySlug((await params).slug);
  if (!c) return {};
  return {
    title: `${c.title} · Kitevo`,
    description: c.description,
    alternates: { canonical: `/compare/${c.slug}` },
    openGraph: { title: c.title, description: c.description, url: `/compare/${c.slug}` },
  };
}

export default async function ComparisonPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = comparisonBySlug((await params).slug);
  if (!c) notFound();
  const base = APP_URL.replace(/\/$/, "");

  // Number each distinct source once, in order of first use.
  const sources: Source[] = [];
  const ref = (s?: Source) => {
    if (!s) return null;
    let i = sources.findIndex((x) => x.url === s.url);
    if (i === -1) i = sources.push(s) - 1;
    return i + 1;
  };
  const rows = c.rows.map((r) => ({ ...r, n: ref(r.them.source) }));
  const hasUnconfirmed = rows.some((r) => r.them.text === UNCONFIRMED);
  const short = c.name.replace(/^a /, "");

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Compare", item: `${base}/compare` },
        { "@type": "ListItem", position: 2, name: c.title, item: `${base}/compare/${c.slug}` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <BlogHeader />
      <main>
        <section className="mx-auto max-w-4xl px-5 pt-12 sm:px-8 sm:pt-20">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
            <Link href="/compare" className="hover:text-foreground">Compare</Link> <span aria-hidden>/</span> <span className="text-foreground">Kitevo vs {short}</span>
          </nav>
          <h1 className="mt-4 max-w-3xl text-balance text-[clamp(30px,5vw,52px)] font-medium leading-[1.06] tracking-tight text-foreground">{c.title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground">{c.intro}</p>
          <p className="mt-3 text-xs text-muted-foreground">Facts about {short} checked on {CHECKED_ON}, with sources below.</p>
        </section>

        {/* Comparison table: a 3-column grid on wide screens, stacked pairs on phones */}
        <section className="mx-auto max-w-4xl px-5 pt-10 sm:px-8">
          <div className="overflow-hidden rounded-[24px] border border-border bg-background">
            <div className="hidden grid-cols-[11rem_minmax(0,1fr)_minmax(0,1fr)] gap-6 border-b border-border bg-muted/50 px-6 py-3 text-sm font-medium text-foreground md:grid">
              <span />
              <span>Kitevo</span>
              <span className="capitalize">{short}</span>
            </div>
            {rows.map((r) => (
              <div key={r.label} className="grid gap-2 border-b border-border px-5 py-4 last:border-0 md:grid-cols-[11rem_minmax(0,1fr)_minmax(0,1fr)] md:gap-6 md:px-6">
                <span className="text-sm font-medium text-foreground">{r.label}</span>
                <div className="text-sm leading-relaxed text-foreground">
                  <span className="mb-0.5 block text-[11px] font-medium text-muted-foreground md:hidden">Kitevo</span>
                  {r.kitevo}
                </div>
                <div className="text-sm leading-relaxed text-muted-foreground">
                  <span className="mb-0.5 block text-[11px] font-medium capitalize md:hidden">{short}</span>
                  {r.them.text}
                  {r.n && (
                    <a href={`#source-${r.n}`} className="ml-1 align-super text-[10px] font-medium text-primary hover:underline" aria-label={`Source ${r.n}`}>
                      [{r.n}]
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          {hasUnconfirmed && (
            <p className="mt-3 text-xs text-muted-foreground">
              &ldquo;—&rdquo; means we couldn&apos;t confirm {short}&apos;s position from its own materials. Check their site.
            </p>
          )}
        </section>

        <section className="mx-auto grid max-w-4xl gap-4 px-5 pt-12 sm:px-8 md:grid-cols-2">
          {[
            { title: `Choose ${short} if`, items: c.chooseThem, us: false },
            { title: "Choose Kitevo if", items: c.chooseKitevo, us: true },
          ].map((col) => (
            <div key={col.title} className={`rounded-[24px] p-6 ${col.us ? "bg-primary text-primary-foreground" : "border border-border bg-background"}`}>
              <h2 className="text-lg font-medium">{col.title}</h2>
              <ul className="mt-4 space-y-3">
                {col.items.map((it) => (
                  <li key={it} className="flex gap-2.5 text-sm leading-relaxed">
                    <Check size={16} className={`mt-0.5 shrink-0 ${col.us ? "" : "text-muted-foreground"}`} aria-hidden />
                    <span className={col.us ? "" : "text-muted-foreground"}>{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        {c.together && (
          <section className="mx-auto max-w-4xl px-5 pt-6 sm:px-8">
            <p className="rounded-[20px] border border-dashed border-border px-6 py-4 text-sm leading-relaxed text-muted-foreground">
              <strong className="font-medium text-foreground">Using both? </strong>
              {c.together}
            </p>
          </section>
        )}

        <section className="mx-auto max-w-3xl px-5 pt-16 sm:px-8">
          <h2 className="text-2xl font-medium tracking-tight text-foreground">Questions</h2>
          <div className="mt-6 divide-y divide-border border-y border-border">
            {c.faq.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-medium text-foreground">
                  {f.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {sources.length > 0 && (
          <section className="mx-auto max-w-3xl px-5 pt-12 sm:px-8">
            <h2 className="text-sm font-medium text-foreground">Sources</h2>
            <ol className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              {sources.map((s, i) => (
                <li key={s.url} id={`source-${i + 1}`} className="scroll-mt-24">
                  [{i + 1}]{" "}
                  <a href={s.url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2 hover:text-foreground">
                    {s.label}
                  </a>{" "}
                  ({s.kind === "official" ? `${short}'s own site` : "independent review"})
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Checked on {CHECKED_ON}. Prices and features change; if something here is out of date,{" "}
              <a href="https://instagram.com/getkitevo" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                message us on Instagram
              </a>{" "}
              and we&apos;ll fix it.
            </p>
          </section>
        )}

        <section className="mx-auto max-w-4xl px-5 pt-14 sm:px-8">
          <div className="flex flex-col justify-between gap-6 rounded-[28px] bg-foreground p-7 text-background sm:flex-row sm:items-end">
            <div>
              <p className="text-xl font-medium">Make a media kit brands believe</p>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-background/75">Live stats, your rates and a way for brands to reach you, on one link. Free to start.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href="/kit/demo" className="inline-flex h-11 items-center rounded-full border border-background/30 px-5 text-sm font-medium transition-colors hover:bg-background/10">See an example</Link>
              <Link href="/signup" className="inline-flex h-11 items-center rounded-full bg-background px-5 text-sm font-medium text-foreground transition-opacity hover:opacity-85">Create my kit</Link>
            </div>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">
            Other comparisons:{" "}
            {COMPARISONS.filter((o) => o.slug !== c.slug).map((o, i) => (
              <span key={o.slug}>
                {i > 0 && ", "}
                <Link href={`/compare/${o.slug}`} className="underline underline-offset-2 hover:text-foreground">Kitevo vs {o.name.replace(/^a /, "")}</Link>
              </span>
            ))}
          </p>
        </section>
      </main>
      <BlogFooter />
    </div>
  );
}
