import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppNav } from "../components/AppNav";
import { WorkspaceShell, PageHeader } from "../components/workspace/WorkspaceShell";
import { CanceledMessage } from "./CanceledMessage";
import { PricingContent } from "./PricingContent";

export const dynamic = "force-dynamic";

const loading = <p className="mt-12 text-center text-muted-foreground">Loading…</p>;

/**
 * Signed-in creators see their plans inside the workspace (sidebar "Plan & billing").
 * Brands manage Brand Pro in Settings, so they're sent there. Visitors get the public page.
 */
export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { accountType: true } })
    : null;

  if (user?.accountType === "brand") redirect("/settings");

  if (user) {
    return (
      <WorkspaceShell variant="creator" width="wide">
        <PageHeader
          eyebrow="Plan & billing"
          title="Your plan"
          description="Live stats, more kits and the verified tick. Change or cancel any time."
        />
        <CanceledMessage />
        <Suspense fallback={loading}>
          <PricingContent />
        </Suspense>
        <p className="mt-10 text-center text-xs text-muted-foreground">Secure checkout. Manage or cancel your subscription any time.</p>
      </WorkspaceShell>
    );
  }

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

        <Suspense fallback={loading}>
          <PricingContent />
        </Suspense>

        <p className="mt-12 text-sm text-muted-foreground">
          Secure checkout. Manage or upgrade your subscription anytime.
        </p>
      </main>
    </div>
  );
}
