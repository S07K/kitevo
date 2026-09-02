import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

// Markdown blog for SEO. Posts live as `.md` files in `content/blog/` with frontmatter:
//   title, description, date (YYYY-MM-DD), author. The body is standard Markdown.
// Rendered fully server-side (marked -> HTML), styled via `.blog-prose` in globals.css.

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type PostMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
};

export type Post = PostMeta & { html: string; readingTime: string };

marked.setOptions({ gfm: true });

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

function readRaw(slug: string): { data: Record<string, unknown>; content: string } {
  const raw = fs.readFileSync(path.join(BLOG_DIR, `${slug}.md`), "utf8");
  const parsed = matter(raw);
  return { data: parsed.data, content: parsed.content };
}

function toMeta(slug: string, data: Record<string, unknown>): PostMeta {
  return {
    slug,
    title: String(data.title ?? slug),
    description: String(data.description ?? ""),
    date: String(data.date ?? ""),
    author: String(data.author ?? "Kitevo"),
  };
}

/** All posts, newest first. */
export function getAllPosts(): PostMeta[] {
  return getAllPostSlugs()
    .map((slug) => toMeta(slug, readRaw(slug).data))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** One post with rendered HTML, or null if the slug does not exist. */
export function getPostBySlug(slug: string): Post | null {
  try {
    const { data, content } = readRaw(slug);
    const html = marked.parse(content) as string;
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = `${Math.max(1, Math.round(words / 200))} min read`;
    return { ...toMeta(slug, data), html, readingTime };
  } catch {
    return null;
  }
}

/** Human date like "September 2, 2026". Falls back to the raw string if unparseable. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}
