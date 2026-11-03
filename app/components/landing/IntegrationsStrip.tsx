import Link from "next/link";
import type { ReactNode } from "react";
import { SectionHeading } from "@/components/section-heading";
import { IntegrationLogo } from "@/app/components/IntegrationLogo";
import { INTEGRATION_GROUPS } from "@/lib/integrations";

/** Landing: the integrations, grouped by job, linking to /integrations. Same data as that page. */
export function IntegrationsStrip(): ReactNode {
  const groups = INTEGRATION_GROUPS.filter((g) => g.id !== "domain");
  return (
    <section id="integrations" className="mx-auto max-w-[1440px] scroll-mt-24 px-5 pb-24 sm:px-8 sm:pb-32 lg:px-10">
      <SectionHeading
        label="Integrations"
        title="Works with the accounts you already have"
        description="Real numbers from Instagram and YouTube, payments into your own account, files from wherever you keep them."
        align="center"
      />
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {groups.map((g) => (
          <div key={g.id} className="rounded-3xl border border-border p-8">
            <h3 className="text-xl font-medium tracking-tight text-foreground">{g.title}</h3>
            <ul className="mt-6 space-y-4">
              {g.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3">
                  <IntegrationLogo id={it.id} size={36} />
                  <span className="text-sm font-medium text-foreground">{it.name}</span>
                  {it.status === "soon" && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Coming soon</span>}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{g.intro}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center">
        <Link href="/integrations" className="text-sm font-medium text-primary hover:underline">
          See what each integration does
        </Link>
      </p>
    </section>
  );
}
