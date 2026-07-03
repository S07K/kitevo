"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppNav } from "@/app/components/AppNav";
import { AppSidebar } from "@/app/components/AppSidebar";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { Badge } from "@/app/components/Badge";
import { DatePicker } from "@/app/components/DatePicker";

const NICHES = ["Fashion", "Beauty", "Food", "Tech", "Health", "Travel", "Fitness", "Lifestyle", "Gaming", "Parenting", "Finance", "Education"];
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

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
    await fetch(`/api/social/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: current === "open" ? "closed" : "open" }),
      credentials: "include",
    });
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
      router.push(`/brand/inbox?convo=${d.conversationId}`);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <AppSidebar tabs={[
        { href: "/brand", label: "Discover" },
        { href: "/brand/campaigns", label: "Campaigns" },
        { href: "/brand/inbox", label: "Inbox" },
      ]} />

      <main className="md:ml-52 px-5 pt-[73px] pb-[72px] md:pb-16 sm:px-8">
        <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Campaigns</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New campaign
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="mb-6 rounded-2xl border border-border bg-muted/20 p-6 space-y-4">
            <div>
              <p className="text-base font-semibold text-foreground">Create a campaign</p>
              <p className="text-xs text-muted-foreground mt-0.5">Creators will see this and apply with a pitch.</p>
            </div>
            {formError && <p className="text-xs text-red-500">{formError}</p>}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Campaign title *"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
              <textarea
                placeholder="Describe the campaign — what you're looking for, deliverables, and goals. *"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={5}
                className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
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
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={createCampaign}
                disabled={saving}
                className="h-10 px-6 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {saving ? "Publishing…" : "Publish campaign"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(null); }}
                className="h-10 px-4 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Campaign list */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-36 rounded-2xl border border-border bg-muted animate-pulse" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <p className="text-foreground font-medium mb-1">No campaigns yet</p>
            <p className="text-sm text-muted-foreground mb-5">Post a brief and let creators come to you.</p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="h-9 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity"
            >
              Create your first campaign
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((c) => {
              const isOpen = selectedId === c.id;
              const daysLeft = c.deadline ? Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000) : null;
              return (
                <div key={c.id} className={`rounded-2xl border transition-all ${isOpen ? "border-foreground/60 shadow-sm" : "border-border hover:border-foreground/30"} bg-background overflow-hidden`}>
                  {/* Card header */}
                  <div className="p-6 cursor-pointer" onClick={() => setSelectedId(isOpen ? null : c.id)}>
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
                          <p className="text-2xl font-bold text-foreground tabular-nums">{c._count.applications}</p>
                          <p className="text-xs text-muted-foreground">applicant{c._count.applications !== 1 ? "s" : ""}</p>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleStatus(c.id, c.status); }}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                          c.status === "open"
                            ? "border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-950/20"
                            : "border-green-300 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
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
                          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
                        </div>
                      ) : applications.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className="text-sm text-muted-foreground">No applications yet.</p>
                          <p className="text-xs text-muted-foreground mt-1">Share the campaign link to get more visibility.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border">
                          {applications.map((a) => {
                            const niches: string[] = typeof a.creator.niches === "string" ? JSON.parse(a.creator.niches) : (a.creator.niches ?? []);
                            const kit = a.creator.kits[0];
                            const displayName = a.creator.name ?? a.creator.username ?? "Unknown";
                            return (
                              <div key={a.id} className="p-5">
                                <div className="flex items-start gap-3">
                                  <div className="h-10 w-10 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                                    {a.creator.avatarUrl ? (
                                      <img src={a.creator.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                                        {displayName.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
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
                                        "{a.message}"
                                      </p>
                                    )}
                                    <div className="flex items-center gap-3 flex-wrap">
                                      {a.status === "pending" && (
                                        <>
                                          <button type="button" onClick={() => updateApplicationStatus(c.id, a.id, "accepted")} className="h-8 px-4 rounded-full bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors">Accept</button>
                                          <button type="button" onClick={() => updateApplicationStatus(c.id, a.id, "rejected")} className="h-8 px-4 rounded-full border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">Decline</button>
                                          <span className="text-muted-foreground/30">·</span>
                                        </>
                                      )}
                                      {kit && <Link href={`/kit/${kit.slug}`} target="_blank" className="text-xs text-muted-foreground hover:text-foreground transition-colors">View kit →</Link>}
                                      <button type="button" onClick={() => startConversation(a.creator.id)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Message →</button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
