"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { Badge } from "@/app/components/Badge";
import { DatePicker } from "@/app/components/DatePicker";
import { ChevronDown, Download, Plus } from "lucide-react";
import { WorkspaceShell, PageHeader, Panel, Eyebrow } from "@/app/components/workspace/WorkspaceShell";
import { Button, ButtonLink } from "@/app/components/workspace/Button";
import { Skeleton, ListCardSkeleton } from "@/app/components/Skeleton";
import { AvatarImg } from "@/app/components/AvatarImg";
import { CREATOR_NICHES } from "@/lib/niches";

const NICHES = CREATOR_NICHES;
const BUDGET_OPTIONS = ["< $500", "$500–$2k", "$2k–$10k", "$10k–$50k", "$50k+"];

type Campaign = {
  id: string;
  title: string;
  description: string;
  niche: string | null;
  budget: string | null;
  deadline: string | null;
  status: string;
  createdAt: string;
  _count: { applications: number };
  views: number;
  uniqueViewers: number;
  acceptedCount: number;
};

type Application = {
  id: string;
  message: string | null;
  status: string;
  createdAt: string;
  creator: {
    id: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
    niches: string[];
    verifiedTier: string | null;
    kits: { slug: string }[];
  };
};

export default function BrandCampaigns() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", niche: "", budget: "", deadline: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [proLoaded, setProLoaded] = useState(false);
  const [showCapNotice, setShowCapNotice] = useState(false);

  useEffect(() => {
    fetch("/api/me/account-type", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setIsPro(d.verifiedTier === "brand_verified"))
      .catch(() => {})
      .finally(() => setProLoaded(true));
  }, []);

  const openCampaignCount = campaigns.filter((c) => c.status === "open").length;
  const capReached = !isPro && openCampaignCount >= 1;

  function handleNewCampaign() {
    if (capReached) {
      setShowForm(false);
      setShowCapNotice(true);
      return;
    }
    setShowCapNotice(false);
    setShowForm((v) => !v);
  }

  const loadCampaigns = useCallback(() => {
    setLoading(true);
    fetch("/api/social/campaigns", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => Array.isArray(d) && setCampaigns(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  useEffect(() => {
    if (!selectedId) { setApplications([]); return; }
    setLoadingApps(true);
    fetch(`/api/social/campaigns/${selectedId}/applications`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => Array.isArray(d) && setApplications(d))
      .catch(() => {})
      .finally(() => setLoadingApps(false));
  }, [selectedId]);

  async function createCampaign() {
    setFormError(null);
    if (!form.title.trim()) { setFormError("Title is required"); return; }
    if (!form.description.trim()) { setFormError("Description is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/social/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });
      if (res.ok) {
        setForm({ title: "", description: "", niche: "", budget: "", deadline: "" });
        setShowForm(false);
        loadCampaigns();
      } else {
        const d = await res.json().catch(() => ({}));
        setFormError(d.error ?? "Failed to create campaign");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(id: string, current: string) {
    setActionError(null);
    const res = await fetch(`/api/social/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: current === "open" ? "closed" : "open" }),
      credentials: "include",
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setActionError(d.error ?? "Failed to update campaign");
      return;
    }
    loadCampaigns();
  }

  async function updateApplicationStatus(campaignId: string, applicationId: string, status: string) {
    await fetch(`/api/social/campaigns/${campaignId}/applications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, status }),
      credentials: "include",
    });
    setApplications((prev) => prev.map((a) => a.id === applicationId ? { ...a, status } : a));
  }

  async function startConversation(creatorId: string) {
    const res = await fetch("/api/social/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otherUserId: creatorId }),
      credentials: "include",
    });
    if (res.ok) {
      const d = await res.json();
      router.push(`/messages?convo=${d.conversationId}`);
    }
  }

  return (
    <WorkspaceShell variant="brand" width="wide">
        <PageHeader
          eyebrow="Campaigns"
          title="Your campaigns"
          description="Post a brief and creators apply with their kit."
          actions={
            <Button variant="primary" onClick={handleNewCampaign} aria-expanded={showForm}>
              <Plus size={14} aria-hidden /> New campaign
            </Button>
          }
        />

      <div className="grid gap-6 lg:grid-cols-3">
      <div className="min-w-0 lg:col-span-2">

        {actionError && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/20 px-4 py-3">
            <p className="text-sm text-red-600 dark:text-red-400">
              {actionError}
              {actionError.includes("upgrade to run more") && (
                <Link href="/settings" className="ml-1 font-semibold underline hover:no-underline">Upgrade to Brand Pro</Link>
              )}
            </p>
          </div>
        )}

        {/* Free-plan cap reached — upgrade prompt instead of the create form */}
        {capReached && showCapNotice && (
          <div className="mb-6 rounded-2xl border border-[#7c3aed]/40 bg-[#7c3aed]/5 p-6">
            <div className="flex items-start gap-3">
              <VerifiedBadge tier="brand_verified" size="md" />
              <div className="flex-1">
                <p className="text-base font-semibold text-foreground">You&apos;ve reached the free plan limit</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Free brands can keep <strong>1 campaign open</strong> at a time. Close your current campaign to post a new one, or upgrade to Brand Pro for unlimited open campaigns.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <Link href="/settings" className="h-9 px-4 inline-flex items-center rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-80 transition-opacity">
                    Upgrade to Brand Pro
                  </Link>
                  <button type="button" onClick={() => setShowCapNotice(false)} className="h-9 px-4 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create form */}
        {showForm && !capReached && (
          <div className="mb-6 space-y-4 rounded-2xl border border-border bg-background p-5 sm:p-6">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Create a campaign</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Creators will see this and apply with a pitch.</p>
            </div>
            {formError && (
              <div className="text-xs text-red-500">
                {formError}
                {formError.includes("upgrade to run more") && (
                  <Link href="/settings" className="ml-1 font-semibold underline hover:no-underline">Upgrade to Brand Pro</Link>
                )}
              </div>
            )}
            <div className="space-y-3">
              <input
                type="text"
                aria-label="Campaign title"
                placeholder="Campaign title *"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
              <textarea
                aria-label="Campaign description"
                placeholder="Describe the campaign — what you're looking for, deliverables, and goals. *"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={5}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 resize-y"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Creator niche</label>
                  <select
                    value={form.niche}
                    onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">Any niche</option>
                    {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Budget range</label>
                  <select
                    value={form.budget}
                    onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">Not specified</option>
                    {BUDGET_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Application deadline</label>
                <DatePicker
                  value={form.deadline}
                  onChange={(v) => setForm((f) => ({ ...f, deadline: v }))}
                  placeholder="Pick a deadline (optional)"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button onClick={() => { setShowForm(false); setFormError(null); }}>Cancel</Button>
              <Button variant="primary" onClick={createCampaign} disabled={saving}>
                {saving ? "Publishing…" : "Publish campaign"}
              </Button>
            </div>
          </div>
        )}

        {/* Campaign list */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <ListCardSkeleton key={i} height="h-36" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-16 text-center">
            <p className="mb-1 text-sm font-medium text-foreground">No campaigns yet</p>
            <p className="mb-5 text-sm text-muted-foreground">Post a brief and let creators come to you.</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus size={14} aria-hidden /> Create your first campaign
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((c) => {
              const isOpen = selectedId === c.id;
              const daysLeft = c.deadline ? Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000) : null;
              return (
                <div key={c.id} className={`rounded-2xl border transition-all ${isOpen ? "border-foreground/60 shadow-sm" : "border-border hover:border-foreground/30"} bg-background overflow-hidden`}>
                  {/* Card header */}
                  <div
                    className="cursor-pointer p-5 sm:p-6"
                    role="button"
                    tabIndex={0}
                    aria-expanded={isOpen}
                    onClick={() => setSelectedId(isOpen ? null : c.id)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(isOpen ? null : c.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 mb-2">
                          <Badge variant={c.status === "open" ? "open" : "closed"} dot={c.status === "open"}>
                            {c.status === "open" ? "Open" : "Closed"}
                          </Badge>
                          {daysLeft !== null && daysLeft <= 5 && (
                            <Badge variant={daysLeft <= 2 ? "danger" : "warning"}>
                              {daysLeft > 0 ? `${daysLeft}d left` : "Closing today"}
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-foreground leading-snug mb-1.5">{c.title}</h3>
                        <p className={`text-sm text-muted-foreground leading-relaxed ${isOpen ? "" : "line-clamp-2"}`}>{c.description}</p>
                        <div className="flex flex-wrap gap-2 mt-4">
                          {c.niche && <Badge variant="default">{c.niche}</Badge>}
                          {c.budget && <Badge variant="accent">{c.budget}</Badge>}
                          {c.deadline && (
                            <Badge variant="warning">
                              Due {new Date(c.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-3">
                        <div className="text-right">
                          <p className="font-display text-2xl font-semibold text-foreground tabular-nums">{c._count.applications}</p>
                          <p className="text-xs text-muted-foreground">applicant{c._count.applications !== 1 ? "s" : ""}</p>
                        </div>
                        <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                      </div>
                    </div>

                    {/* Analytics strip */}
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4 text-xs text-muted-foreground">
                      <span><strong className="text-foreground tabular-nums">{c.views}</strong> view{c.views !== 1 ? "s" : ""}</span>
                      <span><strong className="text-foreground tabular-nums">{c._count.applications}</strong> applied</span>
                      {c.views > 0 && (
                        <span><strong className="text-foreground tabular-nums">{Math.round((c._count.applications / c.views) * 100)}%</strong> apply rate</span>
                      )}
                      {c._count.applications > 0 && (
                        <span><strong className="text-foreground tabular-nums">{Math.round((c.acceptedCount / c._count.applications) * 100)}%</strong> accepted</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleStatus(c.id, c.status); }}
                        className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors ${
                          c.status === "open"
                            ? "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-900/60 dark:text-amber-400 dark:hover:bg-amber-950/20"
                            : "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-900/60 dark:text-green-400 dark:hover:bg-green-950/20"
                        }`}
                      >
                        {c.status === "open" ? "Close campaign" : "Reopen campaign"}
                      </button>
                      <span className="text-muted-foreground/30 text-sm">·</span>
                      <span className="text-xs text-muted-foreground">
                        Posted {new Date(c.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                      <div className="ml-auto">
                        <span className="text-xs text-muted-foreground">{isOpen ? "Hide applicants ↑" : "View applicants ↓"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Applicants — inline expansion */}
                  {isOpen && (
                    <div className="border-t border-border bg-muted/20">
                      {loadingApps ? (
                        <div className="p-6 space-y-3">
                          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                        </div>
                      ) : applications.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className="text-sm text-muted-foreground">No applications yet.</p>
                          <p className="text-xs text-muted-foreground mt-1">Share the campaign link to get more visibility.</p>
                        </div>
                      ) : (
                        <>
                        <div className="flex items-center justify-between px-5 pt-4 pb-1">
                          <p className="text-xs font-medium text-muted-foreground">{applications.length} applicant{applications.length !== 1 ? "s" : ""}</p>
                          <a
                            href={`/api/social/campaigns/${c.id}/applications/export`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            <Download size={12} aria-hidden />
                            Export CSV
                          </a>
                        </div>
                        <div className="divide-y divide-border">
                          {applications.map((a) => {
                            const niches: string[] = typeof a.creator.niches === "string" ? JSON.parse(a.creator.niches) : (a.creator.niches ?? []);
                            const kit = a.creator.kits[0];
                            const displayName = a.creator.name ?? a.creator.username ?? "Unknown";
                            return (
                              <div key={a.id} className="p-5">
                                <div className="flex items-start gap-3">
                                  <AvatarImg
                                    src={a.creator.avatarUrl}
                                    alt=""
                                    className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
                                    fallback={
                                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                                        {displayName.charAt(0).toUpperCase()}
                                      </span>
                                    }
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                                        <VerifiedBadge tier={a.creator.verifiedTier} size="sm" />
                                        {a.creator.username && <p className="text-xs text-muted-foreground">@{a.creator.username}</p>}
                                      </div>
                                      <Badge variant={a.status === "accepted" ? "success" : a.status === "rejected" ? "danger" : "warning"} dot>
                                        {a.status}
                                      </Badge>
                                    </div>
                                    {niches.length > 0 && (
                                      <div className="flex gap-1 flex-wrap mb-2">
                                        {niches.slice(0, 4).map((n) => <Badge key={n} variant="default">{n}</Badge>)}
                                      </div>
                                    )}
                                    {a.message && (
                                      <p className="text-sm text-muted-foreground bg-background border border-border rounded-xl px-4 py-3 mb-3 leading-relaxed">
                                        &ldquo;{a.message}&rdquo;
                                      </p>
                                    )}
                                    <div className="flex items-center gap-3 flex-wrap">
                                      {a.status === "pending" && (
                                        <>
                                          <button type="button" onClick={() => updateApplicationStatus(c.id, a.id, "accepted")} className="h-8 px-4 rounded-full bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors">Accept</button>
                                          <Button size="sm" variant="danger-outline" onClick={() => updateApplicationStatus(c.id, a.id, "rejected")}>Decline</Button>
                                          <span className="text-muted-foreground/30">·</span>
                                        </>
                                      )}
                                      {kit && <ButtonLink href={`/kit/${kit.slug}`} target="_blank" size="sm" variant="ghost">View kit</ButtonLink>}
                                      <Button size="sm" variant="ghost" onClick={() => startConversation(a.creator.id)}>Message</Button>
                                      {a.status === "accepted" && <ButtonLink href={`/deals/new?source=campaign&ref=${a.id}`} size="sm" variant="secondary">Send offer</ButtonLink>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Rail: plan usage + totals ── */}
      <aside className="min-w-0 space-y-6">
        <Panel title="Plan">
          {!proLoaded ? (
            <div aria-hidden>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
              <Skeleton className="mt-4 h-9 w-full rounded-full" />
            </div>
          ) : isPro ? (
            <>
              <p className="flex items-center gap-1.5 font-display text-lg font-semibold text-foreground">
                Brand Pro <VerifiedBadge tier="brand_verified" size="sm" />
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Unlimited open campaigns, featured placement in the creator feed, and direct messages to any creator.
              </p>
              <p className="mt-3 text-sm text-foreground">
                <span className="font-semibold tabular-nums">{openCampaignCount}</span> open now
              </p>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <p className="font-display text-lg font-semibold text-foreground">Free</p>
                <p className="text-xs tabular-nums text-muted-foreground">{Math.min(openCampaignCount, 1)}/1 open</p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(openCampaignCount, 1) * 100}%` }} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Free brands keep one campaign open at a time. Brand Pro removes the cap and pins your briefs above others.
              </p>
              <ButtonLink href="/settings" variant="primary" className="mt-4 w-full">
                Upgrade to Brand Pro
              </ButtonLink>
            </>
          )}
        </Panel>

        <Panel title="Across all campaigns" bodyClassName="">
          <div className="grid grid-cols-2 gap-px bg-border">
            {[
              { label: "Views", value: campaigns.reduce((n, c) => n + c.views, 0) },
              { label: "Applicants", value: campaigns.reduce((n, c) => n + c._count.applications, 0) },
              { label: "Accepted", value: campaigns.reduce((n, c) => n + c.acceptedCount, 0) },
              { label: "Open", value: openCampaignCount },
            ].map((t) => (
              <div key={t.label} className="bg-background px-5 py-4">
                <Eyebrow>{t.label}</Eyebrow>
                {loading ? (
                  <Skeleton className="mt-2 h-6 w-10 rounded-full" />
                ) : (
                  <p className="mt-1.5 font-display text-2xl font-semibold tabular-nums text-foreground">{t.value.toLocaleString()}</p>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </aside>
      </div>
    </WorkspaceShell>
  );
}
