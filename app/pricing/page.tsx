import { Suspense } from "react";
import { AppNav } from "../components/AppNav";
import { CanceledMessage } from "./CanceledMessage";
import { PricingContent } from "./PricingContent";

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <AppNav links={[{ href: "/dashboard", label: "Dashboard" }]} />

      <main className="pt-[calc(8rem+env(safe-area-inset-top))] px-6 pb-24 max-w-4xl mx-auto text-center">
        <CanceledMessage />
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-6">
          Pricing
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
          Choose your plan
        </h1>
        <p className="mt-6 text-muted-foreground">
          Professional media kits, live stats, and shareable links. Cancel anytime.
        </p>

        <Suspense fallback={<p className="mt-12 text-muted-foreground">Loading…</p>}>
          <PricingContent />
        </Suspense>

        <p className="mt-12 text-sm text-muted-foreground">
          Secure payment via Stripe. Manage or upgrade your subscription anytime.
        </p>
      </main>
    </div>
  );
}
