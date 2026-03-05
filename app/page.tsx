import Link from "next/link";
import { AppNav } from "./components/AppNav";

export default function Home() {
  return (
    <div className="min-h-screen">
      <AppNav
        links={[
          { href: "/pricing", label: "Pricing" },
          { href: "/dashboard", label: "Dashboard" },
          { href: "/pricing", label: "Get Started", primary: true },
        ]}
      />

      <main className="pt-[calc(8rem+env(safe-area-inset-top))] px-6 pb-24 max-w-5xl mx-auto">
        <p className="text-sm uppercase tracking-[0.2em] text-[#8C8C8C] mb-6">
          For Creators • Built for Brand Deals
        </p>
        <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.1] tracking-tight text-[#1A1A1A] max-w-3xl">
          Your link-in-bio.{" "}
          <span className="italic">Reimagined as a pitch deck.</span>
        </h1>
        <p className="mt-8 text-lg text-[#5C5C5C] max-w-xl leading-relaxed">
          Stop sending ugly PDFs. Media Kit Pro turns your presence into a live,
          high-end portfolio—with real engagement rates, audience demographics,
          and growth charts that close deals.
        </p>
        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-[#1A1A1A] text-white font-medium rounded-sm hover:bg-[#2D2D2D] transition-colors"
          >
            Start Building
          </Link>
          <Link
            href="/kit/demo"
            className="px-8 py-4 border border-[#D4D4D4] text-[#1A1A1A] font-medium rounded-sm hover:border-[#1A1A1A] transition-colors"
          >
            View Demo
          </Link>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="p-6 border border-[#E8E6E3] rounded-sm bg-white">
            <span className="text-3xl font-display font-semibold text-[#1A1A1A]">
              Live Data
            </span>
            <p className="mt-3 text-sm text-[#5C5C5C]">
              Connect Instagram & TikTok. Show real engagement rates and growth—not
              screenshots.
            </p>
          </div>
          <div className="p-6 border border-[#E8E6E3] rounded-sm bg-white">
            <span className="text-3xl font-display font-semibold text-[#1A1A1A]">
              Agency Design
            </span>
            <p className="mt-3 text-sm text-[#5C5C5C]">
              Clean, editorial layouts. Looks like a high-end agency portfolio, not
              a generic template.
            </p>
          </div>
          <div className="p-6 border border-[#E8E6E3] rounded-sm bg-white">
            <span className="text-3xl font-display font-semibold text-[#1A1A1A]">
              One Link
            </span>
            <p className="mt-3 text-sm text-[#5C5C5C]">
              One URL to rule them all. Brands click. They see everything. They
              reach out.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
