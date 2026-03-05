import Link from "next/link";
import { AppNav } from "@/app/components/AppNav";

export const metadata = {
  title: "Connect Instagram — Help | Media Kit Pro",
  description: "How to connect your Instagram Business or Creator account and fix common connection errors.",
};

export default function InstagramHelpPage() {
  return (
    <div className="min-h-screen">
      <AppNav
        links={[
          { href: "/pricing", label: "Pricing" },
          { href: "/dashboard", label: "Dashboard" },
        ]}
      />

      <main className="pt-[calc(7rem+env(safe-area-inset-top))] px-6 pb-24 max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-[#5C5C5C] hover:text-[#1A1A1A] mb-8"
        >
          ← Back to dashboard
        </Link>

        <h1 className="font-display text-3xl font-semibold text-[#1A1A1A]">
          Connect Instagram — Help &amp; troubleshooting
        </h1>
        <p className="mt-2 text-[#5C5C5C]">
          Use this guide if &quot;Connect Instagram&quot; fails or you see an error after connecting.
        </p>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-[#1A1A1A]">
            Before you connect
          </h2>
          <p className="mt-2 text-[#5C5C5C] text-sm">
            Our app uses Instagram&apos;s official API, which only works with professional accounts linked to a Facebook Page.
          </p>
          <ol className="mt-4 list-decimal list-inside space-y-3 text-sm text-[#5C5C5C]">
            <li>
              <strong className="text-[#1A1A1A]">Switch to a Professional account</strong> — In the Instagram app: Settings → Account → Switch to professional account (Creator or Business).
            </li>
            <li>
              <strong className="text-[#1A1A1A]">Create or use a Facebook Page</strong> — You need a Facebook Page. Create one at{" "}
              <a href="https://www.facebook.com/pages/creation" target="_blank" rel="noopener noreferrer" className="text-[#1A1A1A] underline">
                facebook.com/pages/creation
              </a>
              .
            </li>
            <li>
              <strong className="text-[#1A1A1A]">Link Instagram to the Page</strong> — In the Instagram app: Settings → Account → Linked accounts → Facebook, and link to your Page. Or in Meta Business Suite / Facebook Page settings, connect your Instagram account to the Page.
            </li>
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-[#1A1A1A]">
            Common errors and what to do
          </h2>

          <div className="mt-6 space-y-6">
            <div className="p-4 rounded-lg border border-[#E8E6E3] bg-white">
              <h3 className="font-semibold text-[#1A1A1A]">No Facebook Page found</h3>
              <p className="mt-1 text-sm text-[#5C5C5C]">
                Your Facebook account doesn’t have a Page, or we couldn’t read it. Create a Page and try again. Make sure you’re logging in with the Facebook account that owns the Page.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-[#E8E6E3] bg-white">
              <h3 className="font-semibold text-[#1A1A1A]">No Instagram Business or Creator account</h3>
              <p className="mt-1 text-sm text-[#5C5C5C]">
                The Page you selected isn’t linked to an Instagram Professional (Business or Creator) account. In Instagram: switch to a professional account, then in Facebook (Page settings or Meta Business Suite) connect that Instagram account to the Page.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-[#E8E6E3] bg-white">
              <h3 className="font-semibold text-[#1A1A1A]">You declined access (access_denied)</h3>
              <p className="mt-1 text-sm text-[#5C5C5C]">
                You cancelled the Facebook login or didn’t grant the requested permissions. Click &quot;Connect Instagram&quot; again and accept all permissions so we can read your Instagram stats and posts.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-[#E8E6E3] bg-white">
              <h3 className="font-semibold text-[#1A1A1A]">Invalid or expired request</h3>
              <p className="mt-1 text-sm text-[#5C5C5C]">
                The connection request expired (e.g. you left the page open too long). Go back to the dashboard and click &quot;Connect Instagram&quot; again.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-[#E8E6E3] bg-white">
              <h3 className="font-semibold text-[#1A1A1A]">Instagram connect is not configured</h3>
              <p className="mt-1 text-sm text-[#5C5C5C]">
                The app hasn’t been set up for Instagram yet. This is for the site owner: add <code className="px-1 py-0.5 bg-[#E8E6E3] rounded text-xs">META_APP_ID</code> and <code className="px-1 py-0.5 bg-[#E8E6E3] rounded text-xs">META_APP_SECRET</code> to the environment and add the redirect URL in the Facebook App settings.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-[#E8E6E3] bg-white">
              <h3 className="font-semibold text-[#1A1A1A]">Something went wrong (server)</h3>
              <p className="mt-1 text-sm text-[#5C5C5C]">
                A temporary error occurred. Wait a few minutes and try again. If it keeps happening, check that your Instagram account is public (or that the app has the right permissions) and that the Facebook App is in Live mode if required.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-[#1A1A1A]">
            Official Meta guides
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a href="https://help.instagram.com/502981923235522" target="_blank" rel="noopener noreferrer" className="text-[#1A1A1A] underline">
                Switch to a professional account (Instagram)
              </a>
            </li>
            <li>
              <a href="https://www.facebook.com/help/instagram/503414493682735" target="_blank" rel="noopener noreferrer" className="text-[#1A1A1A] underline">
                Connect Instagram to a Facebook Page
              </a>
            </li>
            <li>
              <a href="https://developers.facebook.com/docs/instagram-platform" target="_blank" rel="noopener noreferrer" className="text-[#1A1A1A] underline">
                Instagram Platform (developers)
              </a>
            </li>
          </ul>
        </section>

        <div className="mt-12 pt-8 border-t border-[#E8E6E3]">
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-sm hover:bg-[#2D2D2D]"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
