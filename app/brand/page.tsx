"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppNav } from "@/app/components/AppNav";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { DatePicker } from "@/app/components/DatePicker";
import { signOut } from "next-auth/react";

const NICHES = [
  "All", "Fashion", "Beauty", "Food", "Tech", "Health", "Travel",
  "Fitness", "Lifestyle", "Gaming", "Parenting", "Finance", "Education",
];

const BUDGET_ICONS: Record<string, string> = {
  "< $500": "💰",
  "$500–$2k": "💰💰",
  "$2k–$10k": "💰💰💰",
  "$10k–$50k": "💰💰💰💰",
  "$50k+": "💰💰💰💰💰",
};

type Creator = {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  avatarUrl: string | null;
  niches: string[];
  openToCollab: boolean;
  location: string | null;
  verifiedTier: string | null;
  hasInstagram: boolean;
  kit: { id: string; slug: string; name: string } | null;
};

type Conversation = {
  id: string;
  other: {
    id: string;
    name: string | null;
    username: string | null;
    avatarUrl: string | null;
    verifiedTier: string | null;
  } | null;
  lastMessage: { body: string; at: string; mine: boolean } | null;
  unread: boolean;
};

function CreatorCard({ creator, onMessage }: { creator: Creator; onMessage: (id: string) => void }) {
  const initials = (creator.name ?? creator.username ?? "?").charAt(0).toUpperCase();
  return (
    <div className="bg-background border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow group">
      {/* Header band */}
      <div className="h-16 bg-gradient-to-r from-foreground/5 to-foreground/10 relative" />

      <div className="px-5 pb-5 -mt-8">
        {/* Avatar */}
        <div className="relative mb-3 inline-block">
          <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-background bg-muted shadow">
            {creator.avatarUrl ? (
              <img src={creator.avatarUrl} alt={creator.name ?? ""} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-full w-full flex items-center justify-center font-semibold text-lg text-muted-foreground">
                {initials}
              </div>
            )}
          </div>
          {creator.openToCollab && (
            <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-green-500 border-2 border-background" title="Open to collaboration" />
          )}
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-foreground text-sm truncate">{creator.name ?? creator.username}</p>
              <VerifiedBadge tier={creator.verifiedTier} size="sm" />
            </div>
            {creator.username && (
              <p className="text-xs text-muted-foreground">@{creator.username}</p>
            )}
          </div>
          {creator.hasInstagram && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="url(#ig-brand-grad)" aria-label="Instagram connected" className="shrink-0 mt-0.5">
              <defs>
                <linearGradient id="ig-brand-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f09433" />
                  <stop offset="100%" stopColor="#bc1888" />
                </linearGradient>
              </defs>
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          )}
        </div>

        {creator.bio && (
          <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{creator.bio}</p>
        )}

        {creator.niches.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {creator.niches.slice(0, 3).map((n) => (
              <span key={n} className="text-[10px] font-medium bg-muted text-muted-foreground rounded-full px-2 py-0.5">{n}</span>
            ))}
          </div>
        )}

        {creator.location && (
          <p className="mt-2 text-xs text-muted-foreground">📍 {creator.location}</p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onMessage(creator.id)}
            className="flex-1 inline-flex justify-center h-8 items-center rounded-full bg-foreground text-background text-xs font-medium hover:opacity-80 transition-opacity"
          >
            Message
          </button>
          {creator.kit && (
            <Link
              href={`/kit/${creator.kit.slug}`}
              target="_blank"
              className="flex-1 inline-flex justify-center h-8 items-center rounded-full border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors"
            >
              View kit
            </Link>
          )}
          {creator.username && (
            <Link
              href={`/${creator.username}`}
              target="_blank"
              className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Public profile"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BrandDashboard() {
  const [tab, setTab] = useState<"discover" | "campaigns" | "inbox">("discover");
  const [niche, setNiche] = useState("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(false);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ id: string; body: string; createdAt: string; senderId: string; sender: { name: string | null; avatarUrl: string | null } }[]>([]);
  const [msgInput, setMsgInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Campaigns state
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ title: "", description: "", niche: "", budget: "", deadline: "" });
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  type Application = {
    id: string;
    message: string | null;
    status: string;
    createdAt: string;
    creator: { id: string; name: string | null; username: string | null; avatarUrl: string | null; bio: string | null; niches: string[]; verifiedTier: string | null; kits: { slug: string }[] };
  };
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Load my user id
  useEffect(() => {
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setMyUserId(d.id ?? null))
      .catch(() => {});
  }, []);

  // Load creators
  useEffect(() => {
    if (tab !== "discover") return;
    setLoadingCreators(true);
    const params = new URLSearchParams();
    if (niche !== "All") params.set("niche", niche);
    if (debouncedSearch) params.set("q", debouncedSearch);
    fetch(`/api/social/creators?${params}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setCreators(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoadingCreators(false));
  }, [tab, niche, debouncedSearch]);

  // Load conversations + poll
  const loadConvos = useCallback(() => {
    fetch("/api/social/conversations", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (Array.isArray(d)) {
          setConversations(d);
          setUnreadCount(d.filter((c: Conversation) => c.unread).length);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingConvos(true);
    loadConvos();
    setLoadingConvos(false);
    const id = setInterval(loadConvos, 3000);
    return () => clearInterval(id);
  }, [loadConvos]);

  // Load messages when conversation selected
  useEffect(() => {
    if (!activeConvoId) return;
    const load = () => {
      fetch(`/api/social/conversations/${activeConvoId}`, { credentials: "include" })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => Array.isArray(d) && setMessages(d))
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, [activeConvoId]);

  // Load campaigns
  const loadCampaigns = useCallback(() => {
    setLoadingCampaigns(true);
    fetch("/api/social/campaigns", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => Array.isArray(d) && setCampaigns(d))
      .catch(() => {})
      .finally(() => setLoadingCampaigns(false));
  }, []);

  useEffect(() => {
    if (tab !== "campaigns") return;
    loadCampaigns();
  }, [tab, loadCampaigns]);

  // Load applications for selected campaign
  useEffect(() => {
    if (!selectedCampaignId) { setApplications([]); return; }
    setLoadingApplications(true);
    fetch(`/api/social/campaigns/${selectedCampaignId}/applications`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => Array.isArray(d) && setApplications(d))
      .catch(() => {})
      .finally(() => setLoadingApplications(false));
  }, [selectedCampaignId]);

  async function createCampaign() {
    setCampaignError(null);
    if (!campaignForm.title.trim()) { setCampaignError("Title is required"); return; }
    if (!campaignForm.description.trim()) { setCampaignError("Description is required"); return; }
    setCampaignSaving(true);
    try {
      const res = await fetch("/api/social/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignForm),
        credentials: "include",
      });
      if (res.ok) {
        setCampaignForm({ title: "", description: "", niche: "", budget: "", deadline: "" });
        setShowCampaignForm(false);
        loadCampaigns();
      } else {
        const d = await res.json().catch(() => ({}));
        setCampaignError(d.error ?? "Failed to create campaign");
      }
    } finally {
      setCampaignSaving(false);
    }
  }

  async function toggleCampaignStatus(id: string, currentStatus: string) {
    const next = currentStatus === "open" ? "closed" : "open";
    await fetch(`/api/social/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
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
      setActiveConvoId(d.conversationId);
      setTab("inbox");
      loadConvos();
    }
  }

  async function sendMessage() {
    if (!msgInput.trim() || !activeConvoId) return;
    setSendingMsg(true);
    try {
      const res = await fetch(`/api/social/conversations/${activeConvoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: msgInput.trim() }),
        credentials: "include",
      });
      if (res.ok) {
        setMsgInput("");
        // Reload messages
        const d = await fetch(`/api/social/conversations/${activeConvoId}`, { credentials: "include" }).then((r) => r.json());
        if (Array.isArray(d)) setMessages(d);
      }
    } finally {
      setSendingMsg(false);
    }
  }

  const activeConvo = conversations.find((c) => c.id === activeConvoId);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <AppNav
        links={[{ href: "/profile", label: "Settings" }]}
        onLogout={async () => {
          await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
          signOut({ callbackUrl: "/" });
        }}
        tabs={[
          { key: "discover", label: "Discover" },
          { key: "campaigns", label: "Campaigns" },
          { key: "inbox", label: "Inbox", badge: unreadCount },
        ]}
        activeTab={tab}
        onTabChange={(k) => setTab(k as typeof tab)}
      />

      {/* Content area — fills remaining viewport exactly, sits under 57px fixed nav */}
      <div className="flex-1 overflow-hidden mt-[57px]">
        <div className={tab !== "inbox" ? "h-full overflow-y-auto" : "h-full"}>
        <div className={tab !== "inbox" ? "mx-auto max-w-6xl px-5 sm:px-8 py-8" : "h-full"}>

        {/* Discover tab */}
        {tab === "discover" && (
          <div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search creators by name, handle, or bio…"
                className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
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

            {loadingCreators ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-2xl border border-border bg-muted animate-pulse" />
                ))}
              </div>
            ) : creators.length === 0 ? (
              <div className="text-center py-24">
                <p className="text-muted-foreground text-sm">No creators found. Try a different niche or search.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {creators.map((c) => (
                  <CreatorCard key={c.id} creator={c} onMessage={startConversation} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Campaigns tab */}
        {tab === "campaigns" && (
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Campaigns</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowCampaignForm((v) => !v); setSelectedCampaignId(null); }}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                New campaign
              </button>
            </div>

            {/* Create form */}
            {showCampaignForm && (
              <div className="mb-6 rounded-2xl border border-border bg-muted/20 p-6 space-y-4">
                <div>
                  <p className="text-base font-semibold text-foreground">Create a campaign</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Creators will see this and apply with a pitch.</p>
                </div>
                {campaignError && <p className="text-xs text-red-500">{campaignError}</p>}
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Campaign title *"
                    value={campaignForm.title}
                    onChange={(e) => setCampaignForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                  />
                  <textarea
                    placeholder="Describe the campaign — what you're looking for, deliverables, and goals. *"
                    value={campaignForm.description}
                    onChange={(e) => setCampaignForm((f) => ({ ...f, description: e.target.value }))}
                    rows={5}
                    className="w-full px-4 py-3 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Creator niche</label>
                      <select
                        value={campaignForm.niche}
                        onChange={(e) => setCampaignForm((f) => ({ ...f, niche: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                      >
                        <option value="">Any niche</option>
                        {NICHES.filter((n) => n !== "All").map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Budget range</label>
                      <select
                        value={campaignForm.budget}
                        onChange={(e) => setCampaignForm((f) => ({ ...f, budget: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                      >
                        <option value="">Not specified</option>
                        {Object.keys(BUDGET_ICONS).map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Application deadline</label>
                    <DatePicker
                      value={campaignForm.deadline}
                      onChange={(v) => setCampaignForm((f) => ({ ...f, deadline: v }))}
                      placeholder="Pick a deadline (optional)"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={createCampaign}
                    disabled={campaignSaving}
                    className="h-10 px-6 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    {campaignSaving ? "Publishing…" : "Publish campaign"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCampaignForm(false); setCampaignError(null); }}
                    className="h-10 px-4 rounded-full border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Campaign list */}
            {loadingCampaigns ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-36 rounded-2xl border border-border bg-muted animate-pulse" />)}
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-24 border border-dashed border-border rounded-2xl">
                <p className="text-foreground font-medium mb-1">No campaigns yet</p>
                <p className="text-sm text-muted-foreground mb-5">Post a brief and let creators come to you.</p>
                <button
                  type="button"
                  onClick={() => setShowCampaignForm(true)}
                  className="h-9 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity"
                >
                  Create your first campaign
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((c) => {
                  const isOpen = selectedCampaignId === c.id;
                  const daysLeft = c.deadline
                    ? Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <div
                      key={c.id}
                      className={`rounded-2xl border transition-all ${isOpen ? "border-foreground/60 shadow-sm" : "border-border hover:border-foreground/30"} bg-background overflow-hidden`}
                    >
                      {/* Card header — always visible */}
                      <div
                        className="p-6 cursor-pointer"
                        onClick={() => setSelectedCampaignId(isOpen ? null : c.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            {/* Status + title */}
                            <div className="flex items-center gap-2.5 mb-2">
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                                c.status === "open"
                                  ? "border-green-300 text-green-700 bg-green-50 dark:bg-green-950/20"
                                  : "border-border text-muted-foreground bg-muted"
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${c.status === "open" ? "bg-green-500" : "bg-muted-foreground"}`} />
                                {c.status === "open" ? "Open" : "Closed"}
                              </span>
                              {daysLeft !== null && daysLeft <= 5 && (
                                <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${
                                  daysLeft <= 2 ? "border-red-200 text-red-600 bg-red-50 dark:bg-red-950/20" : "border-yellow-200 text-yellow-700 bg-yellow-50 dark:bg-yellow-950/20"
                                }`}>
                                  {daysLeft > 0 ? `${daysLeft}d left` : "Closing today"}
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-semibold text-foreground leading-snug mb-1.5">{c.title}</h3>
                            <p className={`text-sm text-muted-foreground leading-relaxed ${isOpen ? "" : "line-clamp-2"}`}>{c.description}</p>

                            {/* Meta chips */}
                            <div className="flex flex-wrap gap-2 mt-4">
                              {c.niche && (
                                <span className="inline-flex items-center text-xs font-medium bg-muted border border-border text-foreground px-3 py-1 rounded-full">
                                  {c.niche}
                                </span>
                              )}
                              {c.budget && (
                                <span className="inline-flex items-center text-xs font-medium bg-muted border border-border text-foreground px-3 py-1 rounded-full">
                                  {c.budget}
                                </span>
                              )}
                              {c.deadline && (
                                <span className="inline-flex items-center text-xs text-muted-foreground bg-muted border border-border px-3 py-1 rounded-full">
                                  Due {new Date(c.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right: applicant count + chevron */}
                          <div className="shrink-0 flex flex-col items-end gap-3">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-foreground tabular-nums">{c._count.applications}</p>
                              <p className="text-xs text-muted-foreground">applicant{c._count.applications !== 1 ? "s" : ""}</p>
                            </div>
                            <svg
                              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                            >
                              <path d="M6 9l6 6 6-6"/>
                            </svg>
                          </div>
                        </div>

                        {/* Actions row */}
                        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); toggleCampaignStatus(c.id, c.status); }}
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
                            <span className="text-xs text-muted-foreground">
                              {isOpen ? "Hide applicants ↑" : "View applicants ↓"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Applicants — expands inline */}
                      {isOpen && (
                        <div className="border-t border-border bg-muted/20">
                          {loadingApplications ? (
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
                                const niches: string[] = typeof a.creator.niches === "string"
                                  ? JSON.parse(a.creator.niches)
                                  : (a.creator.niches ?? []);
                                const kit = a.creator.kits[0];
                                const displayName = a.creator.name ?? a.creator.username ?? "Unknown";
                                return (
                                  <div key={a.id} className="p-5">
                                    <div className="flex items-start gap-3">
                                      {/* Avatar */}
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
                                        {/* Name row */}
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                                            <VerifiedBadge tier={a.creator.verifiedTier} size="sm" />
                                            {a.creator.username && (
                                              <p className="text-xs text-muted-foreground">@{a.creator.username}</p>
                                            )}
                                          </div>
                                          <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                                            a.status === "accepted" ? "border-green-300 text-green-700 bg-green-50 dark:bg-green-950/20" :
                                            a.status === "rejected" ? "border-red-300 text-red-600 bg-red-50 dark:bg-red-950/20" :
                                            "border-yellow-200 text-yellow-700 bg-yellow-50 dark:bg-yellow-950/20"
                                          }`}>{a.status}</span>
                                        </div>

                                        {/* Niches */}
                                        {niches.length > 0 && (
                                          <div className="flex gap-1 flex-wrap mb-2">
                                            {niches.slice(0, 4).map((n) => (
                                              <span key={n} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{n}</span>
                                            ))}
                                          </div>
                                        )}

                                        {/* Pitch */}
                                        {a.message && (
                                          <p className="text-sm text-muted-foreground bg-background border border-border rounded-xl px-4 py-3 mb-3 leading-relaxed">
                                            "{a.message}"
                                          </p>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center gap-3 flex-wrap">
                                          {a.status === "pending" && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => updateApplicationStatus(selectedCampaignId!, a.id, "accepted")}
                                                className="h-8 px-4 rounded-full bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors"
                                              >
                                                Accept
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => updateApplicationStatus(selectedCampaignId!, a.id, "rejected")}
                                                className="h-8 px-4 rounded-full border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                              >
                                                Decline
                                              </button>
                                              <span className="text-muted-foreground/30">·</span>
                                            </>
                                          )}
                                          {kit && (
                                            <Link href={`/kit/${kit.slug}`} target="_blank" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                                              View kit →
                                            </Link>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => startConversation(a.creator.id)}
                                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            Message →
                                          </button>
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
        )}

        {/* Inbox tab */}
        {tab === "inbox" && (
          <div className="flex h-full border-t border-border">
            {/* Sidebar — full width on mobile, fixed on desktop */}
            <div className={`${activeConvoId ? "hidden md:flex" : "flex"} flex-col w-full md:w-72 md:shrink-0 border-r border-border`}>
              <div className="px-5 py-4 border-b border-border">
                <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Messages</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingConvos ? (
                  <div className="p-4 space-y-1">
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[68px] bg-muted/50 animate-pulse rounded-lg" />)}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-muted-foreground">No conversations yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Message a creator from Discover.</p>
                  </div>
                ) : (
                  <div>
                    {conversations.map((c) => {
                      const other = c.other;
                      const name = other?.name ?? other?.username ?? "Unknown";
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setActiveConvoId(c.id)}
                          className={`w-full text-left px-5 py-4 flex items-center gap-3 transition-colors hover:bg-muted/40 border-b border-border/50 ${activeConvoId === c.id ? "bg-muted/60" : ""}`}
                        >
                          <div className="relative shrink-0">
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-muted border border-border">
                              {other?.avatarUrl ? (
                                <img src={other.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
                                  {name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            {c.unread && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-background" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <div className="flex items-center gap-1 min-w-0">
                                <p className={`text-sm truncate ${c.unread ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>{name}</p>
                                <VerifiedBadge tier={other?.verifiedTier} size="sm" />
                              </div>
                              {c.lastMessage?.at && (
                                <p className="text-[10px] text-muted-foreground shrink-0">
                                  {new Date(c.lastMessage.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </p>
                              )}
                            </div>
                            {c.lastMessage && (
                              <p className={`text-xs truncate ${c.unread ? "text-foreground" : "text-muted-foreground"}`}>
                                {c.lastMessage.mine ? "You: " : ""}{c.lastMessage.body}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Thread — hidden on mobile when no active convo */}
            <div className={`${!activeConvoId ? "hidden md:flex" : "flex"} flex-1 flex-col min-w-0 overflow-hidden bg-background`}>
              {!activeConvoId ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <p className="text-sm text-muted-foreground">Select a conversation</p>
                  <p className="text-xs text-muted-foreground">or message a creator from Discover</p>
                </div>
              ) : (
                <>
                  {/* Thread header */}
                  <div className="px-4 py-4 border-b border-border flex items-center gap-3 shrink-0">
                    {/* Back button — mobile only */}
                    <button
                      type="button"
                      onClick={() => setActiveConvoId(null)}
                      className="md:hidden shrink-0 -ml-1 h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      aria-label="Back to messages"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 5l-7 7 7 7"/>
                      </svg>
                    </button>
                    {activeConvo?.other && (
                      <>
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                          {activeConvo.other.avatarUrl ? (
                            <img src={activeConvo.other.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-xs font-semibold text-muted-foreground">
                              {(activeConvo.other.name ?? activeConvo.other.username ?? "?").charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-foreground">
                            {activeConvo.other.name ?? activeConvo.other.username}
                          </p>
                          <VerifiedBadge tier={activeConvo.other.verifiedTier} size="sm" />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">
                    {messages.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center mt-12">Start the conversation ↓</p>
                    )}
                    {messages.map((m) => {
                      const mine = m.senderId === myUserId;
                      return (
                        <div key={m.id} className={`flex items-end gap-2.5 ${mine ? "justify-end" : "justify-start"}`}>
                          {!mine && activeConvo?.other && (
                            <div className="h-7 w-7 rounded-full overflow-hidden bg-muted border border-border shrink-0 mb-0.5">
                              {activeConvo.other.avatarUrl ? (
                                <img src={activeConvo.other.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                  {(activeConvo.other.name ?? "?").charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          )}
                          <div className={`max-w-[68%] px-4 py-2.5 text-sm leading-relaxed ${
                            mine
                              ? "bg-foreground text-background rounded-2xl rounded-br-md"
                              : "bg-muted text-foreground rounded-2xl rounded-bl-md"
                          }`}>
                            {m.body}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Compose */}
                  <div className="px-6 py-4 border-t border-border shrink-0">
                    <div className="flex items-center gap-3 bg-muted/40 border border-border rounded-2xl px-4 py-2.5">
                      <input
                        type="text"
                        value={msgInput}
                        onChange={(e) => setMsgInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder="Type a message…"
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={sendMessage}
                        disabled={!msgInput.trim() || sendingMsg}
                        className="shrink-0 h-8 w-8 rounded-xl bg-foreground text-background flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-30"
                      >
                        {sendingMsg ? (
                          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">Enter to send</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        </div>
        </div>
      </div>
    </div>
  );
}
