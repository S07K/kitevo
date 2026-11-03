import type { Metadata } from "next";
import { BlogCover, coverKind } from "./BlogArt";
import Link from "next/link";
import { getAllPosts, formatDate } from "@/lib/blog";
import { APP_URL } from "@/lib/app-url";
import { BlogHeader, BlogFooter } from "./BlogChrome";

const BASE = APP_URL.replace(/\/$/, "");

export const metadata: Metadata = {
  title: "Kitevo Blog — Guides for Creators",
  description:
    "Practical guides on media kits, growing your audience, and landing brand deals as a creator.",
  alternates: { canonical: `${BASE}/blog` },
  openGraph: {
    title: "Kitevo Blog — Guides for Creators",
    description:
      "Practical guides on media kits, growing your audience, and landing brand deals as a creator.",
    url: `${BASE}/blog`,
    siteName: "Kitevo",
    type: "website",
  },
};

export default function BlogIndex() {
  const posts = getAllPosts();

  return (
    <div className="bg-canvas min-h-screen">
      <BlogHeader />

      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-muted-foreground mb-4 text-xs font-semibold tracking-[0.18em] uppercase">
          The Kitevo Blog
        </p>
        <h1 className="font-display text-foreground text-4xl font-medium tracking-tight sm:text-5xl">
          Guides for creators
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl text-lg">
          How to build a media kit brands take seriously, grow your audience, and turn your
          following into paid partnerships.
        </p>

        <ul className="mt-14 grid gap-10 sm:grid-cols-2">
          {posts.length === 0 && (
            <li className="text-muted-foreground">New guides are on the way.</li>
          )}
          {posts.map((post) => (
            <li key={post.slug} className="min-w-0">
              <Link href={`/blog/${post.slug}`} className="group block">
                <BlogCover kind={coverKind(post.cover)} className="mb-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {formatDate(post.date)}
                </p>
                <h2 className="font-display text-foreground mt-2 text-2xl font-medium tracking-tight transition-opacity group-hover:opacity-70">
                  {post.title}
                </h2>
                <p className="text-muted-foreground mt-2 max-w-2xl">{post.description}</p>
                <span className="text-foreground mt-3 inline-flex text-sm font-medium">
                  Read guide
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <BlogFooter />
    </div>
  );
}
