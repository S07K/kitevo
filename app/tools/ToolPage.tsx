import Link from "next/link";
import type { ReactNode } from "react";
import { BlogHeader, BlogFooter } from "@/app/blog/BlogChrome";
import { APP_URL } from "@/lib/app-url";

export type Faq = { q: string; a: string };

/**
 * Shell for a free tool page: title + intro, the tool, "How it works" (the method, stated
 * plainly), FAQ, and the hand-off to a live kit. Emits WebApplication + FAQPage JSON-LD.
 */
export function ToolPage({
  path,
  name,
  title,
  intro,
  tool,
  method,
  faq,
  related,
}: {
  path: string;
  name: string;
  title: string;
  intro: string;
  tool: ReactNode;
  method: { title: string; body: ReactNode };
  faq: Faq[];
  related: { href: string; label: string; body: string };
}) {
  const url = `${APP_URL.replace(/\/$/, "")}${path}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name,
      url,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: "Kitevo", url: APP_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <BlogHeader width="5xl" />
      <main>
        <section className="mx-auto max-w-5xl px-5 pt-12 pb-8 sm:px-8 sm:pt-20">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
            <Link href="/tools" className="hover:text-foreground">Free tools</Link> <span aria-hidden>/</span> <span className="text-foreground">{name}</span>
          </nav>
          <h1 className="mt-4 max-w-3xl text-[clamp(32px,5.5vw,56px)] font-medium leading-[1.05] tracking-tight text-foreground text-balance">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{intro}</p>
        </section>

        <section className="mx-auto max-w-5xl px-5 sm:px-8">{tool}</section>

        <section className="mx-auto max-w-3xl px-5 pt-20 sm:px-8">
          <h2 className="text-2xl font-medium tracking-tight text-foreground">{method.title}</h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground [&_table]:w-full [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_td:last-child]:pr-0 [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-medium [&_th]:text-foreground">
            {method.body}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 pt-16 sm:px-8">
          <h2 className="text-2xl font-medium tracking-tight text-foreground">Questions</h2>
          <div className="mt-6 divide-y divide-border border-y border-border">
            {faq.map((f) => (
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

        <section className="mx-auto grid max-w-5xl gap-4 px-5 pt-16 sm:px-8 md:grid-cols-[1fr_1.4fr]">
          <Link href={related.href} className="group rounded-[28px] border border-border bg-background p-6 transition-colors hover:border-primary">
            <p className="text-xs text-muted-foreground">Another free tool</p>
            <p className="mt-2 text-lg font-medium text-foreground">{related.label} <span className="inline-block transition-transform group-hover:translate-x-0.5" aria-hidden>→</span></p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{related.body}</p>
          </Link>
          <div className="flex flex-col justify-between gap-6 rounded-[28px] bg-foreground p-6 text-background sm:flex-row sm:items-end">
            <div>
              <p className="text-lg font-medium">Turn this into a live media kit</p>
              <p className="mt-1 max-w-sm text-sm leading-relaxed text-background/75">
                One link with your rates and stats synced from Instagram and YouTube, so brands see real numbers. Free to start.
              </p>
            </div>
            <Link href="/signup" className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-background px-5 text-sm font-medium text-foreground transition-opacity hover:opacity-85">
              Create my kit
            </Link>
          </div>
        </section>
      </main>
      <BlogFooter width="5xl" />
    </div>
  );
}
