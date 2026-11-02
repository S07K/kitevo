import Link from "next/link";
import { LogoMark } from "@/app/components/Logo";

/** Lightweight header for blog pages — brand logo home + a single CTA. No in-page
 * anchors (those belong to the landing page), so it works on any blog URL. */
export function BlogHeader() {
  return (
    <header className="border-border border-b">
      <div className="mx-auto flex h-[57px] max-w-3xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="font-display text-foreground flex shrink-0 items-center gap-2 rounded-sm text-lg font-semibold tracking-tight transition-opacity hover:opacity-70"
        >
          <LogoMark size={22} on="auto" />
          Kitevo
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/tools" className="text-muted-foreground hover:text-foreground hidden text-sm font-medium transition-colors sm:inline">
            Free tools
          </Link>
          <Link href="/blog" className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors">
            Blog
          </Link>
          <Link
            href="/signup"
            className="bg-primary text-primary-foreground inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-80"
          >
            Get started free
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BlogFooter() {
  return (
    <footer className="border-border mt-20 border-t">
      <div className="text-muted-foreground mx-auto flex max-w-3xl flex-col items-start justify-between gap-4 px-5 py-10 text-sm sm:flex-row sm:items-center sm:px-8">
        <div className="flex items-center gap-2">
          <LogoMark size={18} on="auto" />
          <span>Live media kits for creators.</span>
        </div>
        <div className="flex gap-5">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
