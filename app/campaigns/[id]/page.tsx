"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { AppNav } from "@/app/components/AppNav";
import { AppSidebar } from "@/app/components/AppSidebar";

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
    brandProfile: {
      companyName: string;
      industry: string;
      logoUrl: string | null;
      website: string | null;
      description: string | null;
    } | null;
  };
  _count: { applications: number };
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [myApplication, setMyApplication] = useState<{ status: string } | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [pitch, setPitch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/social/campaigns/${id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) { setNotFound(true); }
        else { setCampaign(d); }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    // Check if already applied
    fetch(`/api/social/campaigns/${id}/apply`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setMyApplication(d))
      .catch(() => {});
  }, [id]);

  async function submitApplication() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/social/campaigns/${id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: pitch }),
        credentials: "include",
      });
      if (res.ok) {
        setMyApplication({ status: "pending" });
        setShowApply(false);
        setPitch("");
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to submit. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const company = campaign?.brand.brandProfile?.companyName ?? campaign?.brand.name ?? "Brand";
  const logo = campaign?.brand.brandProfile?.logoUrl ?? campaign?.brand.avatarUrl;
  const daysLeft = campaign?.deadline
    ? Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <AppNav
        links={[{ href: "/dashboard", label: "Dashboard" }]}
        onLogout={async () => {
          await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
          signOut({ callbackUrl: "/" });
        }}
      />
      <AppSidebar tabs={[
        { href: "/social/inbox", label: "Inbox" },
        { href: "/social/campaigns", label: "Campaigns" },
      ]} />

      <main className="md:ml-52 px-5 pt-[73px] pb-[72px] md:pb-20 sm:px-8">
        <div className="mx-auto max-w-2xl">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-5 w-32 bg-muted rounded-full" />
            <div className="h-10 w-2/3 bg-muted rounded-2xl" />
            <div className="h-4 w-full bg-muted rounded-full" />
            <div className="h-4 w-4/5 bg-muted rounded-full" />
          </div>
        ) : notFound ? (
          <div className="text-center py-24">
            <p className="text-lg font-semibold text-foreground mb-2">Campaign not found</p>
            <p className="text-sm text-muted-foreground mb-6">It may have been closed or removed.</p>
            <Link href="/social/campaigns" className="text-sm font-medium text-foreground underline underline-offset-4">
              Browse open campaigns
            </Link>
          </div>
        ) : campaign ? (
          <div className="space-y-8">
            {/* Back */}
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
              Back
            </button>

            {/* Brand card */}
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl overflow-hidden bg-muted border border-border shrink-0">
                {logo ? (
                  <img src={logo} alt={company} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xl font-bold text-muted-foreground">
                    {company.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">{company}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {campaign.brand.brandProfile?.industry && (
                    <span className="text-xs text-muted-foreground">{campaign.brand.brandProfile.industry}</span>
                  )}
                  {campaign.brand.brandProfile?.website && (
                    <>
                      <span className="text-muted-foreground/30 text-xs">·</span>
                      <a
                        href={campaign.brand.brandProfile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {campaign.brand.brandProfile.website.replace(/^https?:\/\//, "")}
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Title + meta chips */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight leading-snug mb-4">
                {campaign.title}
              </h1>
              <div className="flex flex-wrap gap-2">
                {campaign.niche && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted text-foreground px-3 py-1.5 rounded-full border border-border">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    {campaign.niche}
                  </span>
                )}
                {campaign.budget && (
                  <span className="inline-flex items-center text-xs font-medium bg-muted text-foreground px-3 py-1.5 rounded-full border border-border">
                    💰 {campaign.budget}
                  </span>
                )}
                {daysLeft !== null && (
                  <span className={`inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-full border ${
                    daysLeft <= 3
                      ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800"
                      : "bg-muted text-foreground border-border"
                  }`}>
                    📅 {daysLeft > 0 ? `${daysLeft}d left` : "Closing soon"}
                  </span>
                )}
                <span className="inline-flex items-center text-xs text-muted-foreground px-3 py-1.5 rounded-full border border-border">
                  {campaign._count.applications} applicant{campaign._count.applications !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Brief */}
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Campaign Brief</h2>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {campaign.description.split("\n").filter(Boolean).map((para, i) => (
                  <p key={i} className="text-sm text-foreground leading-relaxed mb-3 last:mb-0">
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* Brand about (if description exists) */}
            {campaign.brand.brandProfile?.description && (
              <>
                <div className="border-t border-border" />
                <div>
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">About {company}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{campaign.brand.brandProfile.description}</p>
                </div>
              </>
            )}

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Apply section */}
            {myApplication ? (
              <div className={`rounded-2xl border p-5 ${
                myApplication.status === "accepted"
                  ? "border-green-300 bg-green-50 dark:bg-green-950/20"
                  : myApplication.status === "rejected"
                  ? "border-red-200 bg-red-50 dark:bg-red-950/20"
                  : "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20"
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${
                    myApplication.status === "accepted" ? "bg-green-500" :
                    myApplication.status === "rejected" ? "bg-red-500" : "bg-yellow-500"
                  }`} />
                  <p className="text-sm font-semibold text-foreground capitalize">
                    Application {myApplication.status}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {myApplication.status === "accepted"
                    ? "Congrats! Check your inbox — the brand may reach out."
                    : myApplication.status === "rejected"
                    ? "This one wasn't a fit. Keep applying to other campaigns."
                    : "Your application is under review. The brand will respond soon."}
                </p>
              </div>
            ) : showApply ? (
              <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground mb-0.5">Your pitch</h2>
                  <p className="text-xs text-muted-foreground">Tell the brand why you're a great fit. Keep it real and specific.</p>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <textarea
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  placeholder="Tell the brand why you're a great fit — your niche, audience, past work…"
                  rows={5}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={submitApplication}
                    disabled={submitting}
                    className="h-10 px-6 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    {submitting ? "Submitting…" : "Submit application"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowApply(false); setPitch(""); setError(null); }}
                    className="h-10 px-4 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowApply(true)}
                  className="h-11 px-8 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity"
                >
                  Apply to this campaign
                </button>
                <p className="text-xs text-muted-foreground">Free · No commitments</p>
              </div>
            )}
          </div>
        ) : null}
        </div>
      </main>
    </div>
  );
}
