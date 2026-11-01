"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/app/components/Badge";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { WorkspaceShell, PageHeader, Panel } from "@/app/components/workspace/WorkspaceShell";
import { ButtonLink } from "@/app/components/workspace/Button";
import { Skeleton, ListCardSkeleton } from "@/app/components/Skeleton";
import { AvatarImg } from "@/app/components/AvatarImg";
import { CREATOR_NICHES } from "@/lib/niches";

const NICHES = ["All", ...CREATOR_NICHES];
const STATUS_LABEL: Record<string, string> = { pending: "Pending", accepted: "Accepted", rejected: "Not selected" };

type Campaign = {
  id: string;
  title: string;
  description: string;
  niche: string | null;
  budget: string | null;
  deadline: string | null;
  status: string;
  createdAt: string;
  brand: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    verifiedTier: string | null;
    brandProfile: { companyName: string; industry: string; logoUrl: string | null } | null;
  };
  _count: { applications: number };
  applications: { status: string }[];
};

export default function CreatorCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [niche, setNiche] = useState("All");
  // Unfiltered list for the rail's application summary (the feed itself is filtered by niche).
  const [all, setAll] = useState<Campaign[] | null>(null);

  useEffect(() => {
    fetch("/api/social/campaigns", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAll(Array.isArray(d) ? d : []))
      .catch(() => setAll([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (niche !== "All") params.set("niche", niche);
    fetch(`/api/social/campaigns?${params}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => Array.isArray(d) && setCampaigns(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [niche]);


  const mine = (all ?? []).filter((c) => c.applications.length > 0);
  const counts = {
    applied: mine.length,
    pending: mine.filter((c) => c.applications[0]?.status === "pending").length,
    accepted: mine.filter((c) => c.applications[0]?.status === "accepted").length,
  };

  return (
    <WorkspaceShell variant="creator" width="wide">
      <PageHeader eyebrow="Social" title="Campaigns" description="Open briefs from brands. Apply with your kit and a short pitch." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main: filter + feed ── */}
        <div className="min-w-0 lg:col-span-2">
          <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by niche">
            {NICHES.map((n) => {
              const on = niche === n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setNiche(n)}
                  className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors ${
                    on ? "border-primary bg-primary text-primary-foreground" : "border-transparent bg-muted text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <ListCardSkeleton key={i} />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-16 text-center">
              <Sparkles size={18} className="mx-auto text-muted-foreground" aria-hidden />
              <p className="mt-2 text-sm font-medium text-foreground">{niche === "All" ? "No open campaigns right now" : `No open ${niche} campaigns`}</p>
              <p className="mt-1 text-sm text-muted-foreground">New briefs from brands show up here. Try another niche or check back soon.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => {
                const applied = c.applications.length > 0;
                const appStatus = c.applications[0]?.status;
                const brand = c.brand;
                const company = brand.brandProfile?.companyName ?? brand.name ?? "Brand";
                const logo = brand.brandProfile?.logoUrl ?? brand.avatarUrl;
                const daysLeft = c.deadline ? Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000) : null;

                return (
                  <Link
                    key={c.id}
                    href={`/campaigns/${c.id}`}
                    className="group block rounded-2xl border border-border bg-background p-5 transition-all hover:border-foreground/30 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <AvatarImg
                        src={logo}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                        fallback={
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">
                            {company.charAt(0).toUpperCase()}
                          </span>
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-xs font-medium text-muted-foreground">{company}</p>
                          <VerifiedBadge tier={brand.verifiedTier} size="sm" />
                          {brand.verifiedTier === "brand_verified" && (
                            <span className="rounded-full bg-[#7c3aed]/10 px-2 py-0.5 text-[11px] font-semibold text-[#7c3aed] dark:text-[#a78bfa]">Featured</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-base font-semibold leading-snug text-foreground">{c.title}</p>
                      </div>
                      {applied && (
                        <Badge variant={appStatus === "accepted" ? "success" : appStatus === "rejected" ? "danger" : "warning"} dot>
                          {STATUS_LABEL[appStatus ?? ""] ?? appStatus}
                        </Badge>
                      )}
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{c.description}</p>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {c.niche && <Badge variant="default">{c.niche}</Badge>}
                        {c.budget && <Badge variant="accent">{c.budget}</Badge>}
                        {daysLeft !== null && <Badge variant={daysLeft <= 3 ? "danger" : "warning"}>{daysLeft > 0 ? `${daysLeft}d left` : "Closing soon"}</Badge>}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                        {applied ? "View application" : "View brief"} <ArrowRight size={12} aria-hidden />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Rail ── */}
        <aside className="min-w-0 space-y-6">
          <Panel title="Your applications" bodyClassName="">
            <div className="grid grid-cols-3 gap-px bg-border">
              {[
                { label: "Applied", value: counts.applied },
                { label: "Pending", value: counts.pending },
                { label: "Accepted", value: counts.accepted },
              ].map((t) => (
                <div key={t.label} className="bg-background px-4 py-4 text-center">
                  {all === null ? (
                    <Skeleton className="mx-auto h-6 w-8 rounded-full" />
                  ) : (
                    <p className="font-display text-2xl font-semibold tabular-nums text-foreground">{t.value}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{t.label}</p>
                </div>
              ))}
            </div>
            <p className="border-t border-border px-5 py-3 text-xs leading-relaxed text-muted-foreground sm:px-6">
              {counts.applied === 0 ? "Applications you send to open campaigns show up here." : "Counts cover campaigns that are still open."}
            </p>
          </Panel>

          <Panel title="Stand out">
            <ul className="space-y-2.5">
              {[
                "Brands can open your media kit straight from your application.",
                "Add your rates and connect your stats so brands can decide quickly.",
                "Keep pitches short: who you reach, and one idea for them.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <Check size={13} strokeWidth={2.5} className="mt-0.5 shrink-0 text-foreground" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <ButtonLink href="/dashboard" className="mt-4 w-full" size="md">
              Polish my kit
            </ButtonLink>
          </Panel>
        </aside>
      </div>
    </WorkspaceShell>
  );
}
