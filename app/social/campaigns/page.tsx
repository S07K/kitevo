"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppNav } from "@/app/components/AppNav";
import { Badge } from "@/app/components/Badge";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { WorkspaceSidebar } from "@/app/components/WorkspaceSidebar";

const NICHES = ["All", "Fashion", "Beauty", "Food", "Tech", "Health", "Travel", "Fitness", "Lifestyle", "Gaming", "Parenting", "Finance", "Education"];

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
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/social/conversations", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => Array.isArray(d) && setUnreadCount(d.filter((c: { unread: boolean }) => c.unread).length))
      .catch(() => {});
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


  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <WorkspaceSidebar variant="creator" />

      <main className="md:ml-56 px-5 pt-[73px] pb-[72px] md:pb-16 sm:px-8">
        <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-foreground">Open Campaigns</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Browse brand briefs and apply with your pitch.</p>
        </div>

        {/* Niche filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {NICHES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNiche(n)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                niche === n
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl border border-border bg-muted animate-pulse" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground text-sm">No open campaigns right now.</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later or try a different niche.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const applied = c.applications.length > 0;
              const appStatus = c.applications[0]?.status;
              const brand = c.brand;
              const company = brand.brandProfile?.companyName ?? brand.name ?? "Brand";
              const logo = brand.brandProfile?.logoUrl ?? brand.avatarUrl;
              const daysLeft = c.deadline
                ? Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000)
                : null;

              return (
                <Link
                  key={c.id}
                  href={`/campaigns/${c.id}`}
                  className="block rounded-2xl border border-border bg-background p-5 hover:border-foreground/30 hover:shadow-sm transition-all"
                >
                  {/* Brand row */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                      {logo ? (
                        <img src={logo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                          {company.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{company}</p>
                    <VerifiedBadge tier={brand.verifiedTier} size="sm" />
                    {brand.verifiedTier === "brand_verified" && (
                      <span className="text-[10px] font-semibold text-[#7c3aed] bg-[#7c3aed]/10 rounded-full px-2 py-0.5">Featured</span>
                    )}
                    {brand.brandProfile?.industry && (
                      <Badge variant="accent">{brand.brandProfile.industry}</Badge>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-foreground mb-1">{c.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.description}</p>

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {c.niche && <Badge variant="default">{c.niche}</Badge>}
                      {c.budget && <Badge variant="accent">{c.budget}</Badge>}
                      {daysLeft !== null && (
                        <Badge variant={daysLeft <= 3 ? "danger" : "warning"}>
                          {daysLeft > 0 ? `${daysLeft}d left` : "Closing soon"}
                        </Badge>
                      )}
                    </div>
                    {applied ? (
                      <Badge
                        variant={appStatus === "accepted" ? "success" : appStatus === "rejected" ? "danger" : "warning"}
                        dot
                      >
                        {appStatus}
                      </Badge>
                    ) : (
                      <span className="text-[10px] font-medium text-muted-foreground">View & apply</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
