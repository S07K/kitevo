import { getPublicTiers } from "@/config/subscriptions";
import { AppNav } from "../components/AppNav";
import { CanceledMessage } from "./CanceledMessage";
import { PricingTiers } from "./PricingTiers";
import { MOCK_CREATOR } from "@/lib/mock-data";

export default async function PricingPage() {
  const tiers = getPublicTiers();

  return (
    <div className="min-h-screen">
      <AppNav links={[{ href: "/dashboard", label: "Dashboard" }]} />

      <main className="pt-[calc(8rem+env(safe-area-inset-top))] px-6 pb-24 max-w-4xl mx-auto text-center">
        <CanceledMessage />
        <p className="text-sm uppercase tracking-[0.2em] text-[#8C8C8C] mb-6">
          Pricing
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-[#1A1A1A]">
          Choose your plan
        </h1>
        <p className="mt-6 text-[#5C5C5C]">
          Professional media kits, live stats, and shareable links. Cancel anytime.
        </p>

        <PricingTiers tiers={tiers} email={MOCK_CREATOR.email} />

        <p className="mt-12 text-sm text-[#8C8C8C]">
          Secure payment via Stripe. Manage or upgrade your subscription anytime.
        </p>
      </main>
    </div>
  );
}
