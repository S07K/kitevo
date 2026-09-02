import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPostSlugs, getPostBySlug, formatDate } from "@/lib/blog";
import { APP_URL } from "@/lib/app-url";
import { BlogHeader, BlogFooter } from "../BlogChrome";

const BASE = APP_URL.replace(/\/$/, "");

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Not found — Kitevo Blog" };
  const url = `${BASE}/blog/${slug}`;
  return {
    title: `${post.title} — Kitevo`,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      siteName: "Kitevo",
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: post.author },
    publisher: { "@type": "Organization", name: "Kitevo" },
    mainEntityOfPage: `${BASE}/blog/${slug}`,
  };

  return (
    <div className="bg-background min-h-screen">
      <BlogHeader />

      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <Link href="/blog" className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
          &larr; All guides
        </Link>

        <article className="mt-8">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {formatDate(post.date)} · {post.readingTime}
          </p>
          <h1 className="font-display text-foreground mt-3 text-4xl font-medium tracking-tight sm:text-5xl">
            {post.title}
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">{post.description}</p>

          <div
            className="blog-prose mt-10"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
        </article>

        {/* End CTA */}
        <div className="border-border bg-muted/40 mt-14 rounded-2xl border p-7 text-center">
          <p className="font-display text-foreground text-2xl font-medium tracking-tight">
            Turn your stats into a link that closes deals
          </p>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Connect Instagram and YouTube once. Kitevo builds a live media kit that stays current
            on its own — verified straight from the source.
          </p>
          <Link
            href="/signup"
            className="bg-foreground text-background mt-5 inline-flex h-10 items-center rounded-full px-6 text-sm font-medium transition-opacity hover:opacity-80"
          >
            Create your kit free
          </Link>
        </div>
      </main>

      <BlogFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
