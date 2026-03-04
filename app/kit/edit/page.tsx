"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AppNav } from "@/app/components/AppNav";
import { KitEditor } from "@/app/dashboard/KitEditor";
import { MOCK_CREATOR } from "@/lib/mock-data";

function KitEditContent() {
  const searchParams = useSearchParams();
  const kitId = searchParams.get("id");

  return (
    <>
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-sm text-[#5C5C5C] hover:text-[#1A1A1A]"
        >
          ← Back to dashboard
        </Link>
      </div>
      <KitEditor kitId={kitId} />
    </>
  );
}

export default function KitEditPage() {
  return (
    <div className="min-h-screen">
      <AppNav
        links={[
          { href: "/dashboard", label: "Dashboard" },
          { href: "/pricing", label: "Pricing" },
          { href: `/kit/${MOCK_CREATOR.username}`, label: "View Kit", external: true },
        ]}
      />

      <main className="pt-[calc(7rem+env(safe-area-inset-top))] px-6 pb-24 max-w-4xl mx-auto">
        <Suspense fallback={<div className="text-[#5C5C5C]">Loading…</div>}>
          <KitEditContent />
        </Suspense>
      </main>
    </div>
  );
}
