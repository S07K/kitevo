import Link from "next/link";
import { AppNav } from "@/app/components/AppNav";

export const metadata = {
  title: "Connect Instagram — Help | Kitevo",
  description: "How to connect your Instagram Business or Creator account and fix common connection errors.",
};

export default function InstagramHelpPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <AppNav
        links={[
          { href: "/pricing", label: "Pricing" },
          { href: "/dashboard", label: "Dashboard" },
        ]}
      />

      <main className="pt-[calc(7rem+env(safe-area-inset-top))] px-6 pb-24 max-w-2xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          Back to dashboard
        </Link>

        <h1 className="font-display text-3xl font-semibold text-foreground">
          Connect Instagram — Help &amp; troubleshooting
        </h1>
        <p className="mt-2 text-muted-foreground">
          Use this guide if &quot;Connect Instagram&quot; fails or you see an error after connecting.
        </p>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Before you connect
          </h2>
          <p className="mt-2 text-muted-foreground text-sm">
            Our app uses Instagram&apos;s official API, which only works with professional accounts linked to a Facebook Page.
          </p>
          <ol className="mt-4 list-decimal list-inside space-y-3 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">Switch to a Professional account</strong> — In the Instagram app: Settings Account Switch to professional account (Creator or Business).
            </li>
            <li>
              <strong className="text-foreground">Create or use a Facebook Page</strong> — You need a Facebook Page. Create one at{" "}
              <a href="https://www.facebook.com/pages/creation" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity">
                facebook.com/pages/creation
              </a>
              .
            </li>
            <li>
              <strong className="text-foreground">Link Instagram to the Page</strong> — In the Instagram app: Settings Account Linked accounts Facebook, and link to your Page. Or in Meta Business Suite / Facebook Page settings, connect your Instagram account to the Page.
            </li>
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Common errors and what to do
          </h2>

          <div className="mt-6 space-y-4">
            {[
              {
                title: "No Facebook Page found",
                body: "Your Facebook account doesn't have a Page, or we couldn't read it. Create a Page and try again. Make sure you're logging in with the Facebook account that owns the Page.",
              },
              {
                title: "No Instagram Business or Creator account",
                body: "The Page you selected isn't linked to an Instagram Professional (Business or Creator) account. In Instagram: switch to a professional account, then in Facebook (Page settings or Meta Business Suite) connect that Instagram account to the Page.",
              },
              {
                title: "You declined access (access_denied)",
                body: 'You cancelled the Facebook login or didn\'t grant the requested permissions. Click "Connect Instagram" again and accept all permissions so we can read your Instagram stats and posts.',
              },
              {
                title: "Invalid or expired request",
                body: 'The connection request expired (e.g. you left the page open too long). Go back to the dashboard and click "Connect Instagram" again.',
              },
              {
                title: "Instagram connect is not configured",
                body: null,
                custom: (
                  <p className="mt-1 text-sm text-muted-foreground">
                    The app hasn&apos;t been set up for Instagram yet. This is for the site owner: add{" "}
                    <code className="px-1 py-0.5 bg-muted rounded text-xs text-foreground">META_APP_ID</code>{" "}
                    and{" "}
                    <code className="px-1 py-0.5 bg-muted rounded text-xs text-foreground">META_APP_SECRET</code>{" "}
                    to the environment and add the redirect URL in the Facebook App settings.
                  </p>
                ),
              },
              {
                title: "Something went wrong (server)",
                body: "A temporary error occurred. Wait a few minutes and try again. If it keeps happening, check that your Instagram account is public (or that the app has the right permissions) and that the Facebook App is in Live mode if required.",
              },
            ].map(({ title, body, custom }) => (
              <div key={title} className="p-4 rounded-xl border border-border bg-background">
                <h3 className="font-semibold text-foreground">{title}</h3>
                {body ? (
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                ) : (
                  custom
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl font-semibold text-foreground">
            Official Meta guides
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a href="https://help.instagram.com/502981923235522" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity">
                Switch to a professional account (Instagram)
              </a>
            </li>
            <li>
              <a href="https://www.facebook.com/help/instagram/503414493682735" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity">
                Connect Instagram to a Facebook Page
              </a>
            </li>
            <li>
              <a href="https://developers.facebook.com/docs/instagram-platform" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4 hover:opacity-70 transition-opacity">
                Instagram Platform (developers)
              </a>
            </li>
          </ul>
        </section>

        <div className="mt-12 pt-8 border-t border-border">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center px-5 bg-foreground text-background text-sm font-medium rounded-full hover:opacity-80 transition-opacity"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
