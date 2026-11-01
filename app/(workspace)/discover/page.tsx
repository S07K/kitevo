"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { WorkspaceShell, PageHeader } from "@/app/components/workspace/WorkspaceShell";
import { CreatorCardSkeleton } from "@/app/components/Skeleton";

const NICHES = [
  "All", "Fashion", "Beauty", "Food", "Tech", "Health", "Travel",
  "Fitness", "Lifestyle", "Gaming", "Parenting", "Finance", "Education",
];

const FOLLOWER_BUCKETS = [
  { label: "Any size", min: "", max: "" },
  { label: "1K–10K", min: "1000", max: "10000" },
  { label: "10K–50K", min: "10000", max: "50000" },
  { label: "50K–100K", min: "50000", max: "100000" },
  { label: "100K–500K", min: "100000", max: "500000" },
  { label: "500K+", min: "500000", max: "" },
];

const ENGAGEMENT_OPTS = [
  { label: "Any engagement", value: "" },
  { label: "1%+", value: "1" },
  { label: "3%+", value: "3" },
  { label: "5%+", value: "5" },
];

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

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
  followerCount: number | null;
  engagementRate: number | null;
  kit: { id: string; slug: string; name: string } | null;
};

function CreatorCard({ creator, onMessage, isSaved, onToggleSave }: { creator: Creator; onMessage: (id: string) => void; isSaved: boolean; onToggleSave: (id: string) => void }) {
  const initials = (creator.name ?? creator.username ?? "?").charAt(0).toUpperCase();
  return (
    <div className="relative bg-background border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <button
        type="button"
        onClick={() => onToggleSave(creator.id)}
        aria-label={isSaved ? "Remove from shortlist" : "Save to shortlist"}
        title={isSaved ? "Saved — click to remove" : "Save to shortlist"}
        className={`absolute top-2.5 right-2.5 z-10 h-8 w-8 inline-flex items-center justify-center rounded-full border transition-colors ${
          isSaved
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background/80 backdrop-blur border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      <div className="h-16 bg-gradient-to-r from-foreground/5 to-foreground/10" />
      <div className="px-5 pb-5 -mt-8">
        <div className="relative mb-3 inline-block">
          <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-background bg-muted shadow">
            {creator.avatarUrl ? (
              <img src={creator.avatarUrl} alt={creator.name ?? ""} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-full w-full flex items-center justify-center font-semibold text-lg text-muted-foreground">{initials}</div>
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
            {creator.username && <p className="text-xs text-muted-foreground">@{creator.username}</p>}
          </div>
          {creator.hasInstagram && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="url(#ig-grad)" aria-label="Instagram connected" className="shrink-0 mt-0.5">
              <defs>
                <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f09433" /><stop offset="100%" stopColor="#bc1888" />
                </linearGradient>
              </defs>
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          )}
        </div>
        {creator.bio && <p className="mt-2 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{creator.bio}</p>}
        {creator.niches.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {creator.niches.slice(0, 3).map((n) => (
              <span key={n} className="text-[10px] font-medium bg-primary-soft text-primary-soft-foreground rounded-full px-2.5 py-0.5">{n}</span>
            ))}
            {creator.niches.length > 3 && (
              <span className="text-[10px] font-medium bg-muted text-muted-foreground rounded-full px-2.5 py-0.5">+{creator.niches.length - 3}</span>
            )}
          </div>
        )}
        {(creator.followerCount != null || creator.engagementRate != null) && (
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {creator.followerCount != null && (
              <span><strong className="text-foreground tabular-nums">{formatFollowers(creator.followerCount)}</strong> followers</span>
            )}
            {creator.engagementRate != null && creator.engagementRate > 0 && (
              <span><strong className="text-foreground tabular-nums">{creator.engagementRate.toFixed(1)}%</strong> engagement</span>
            )}
          </div>
        )}
        {creator.location && <p className="mt-2 text-xs text-muted-foreground">{creator.location}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onMessage(creator.id)}
            className="flex-1 inline-flex justify-center h-8 items-center rounded-full bg-primary text-primary-foreground text-xs font-medium hover:opacity-80 transition-opacity"
          >
            Message
          </button>
          {creator.kit && (
            <Link href={`/kit/${creator.kit.slug}`} target="_blank" className="flex-1 inline-flex justify-center h-8 items-center rounded-full border border-border text-foreground text-xs font-medium hover:bg-muted transition-colors">
              View kit
            </Link>
          )}
          {creator.username && (
            <Link href={`/${creator.username}`} target="_blank" className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Public profile">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BrandDiscover() {
  const router = useRouter();
  const [niche, setNiche] = useState("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(false);
  const [coldMessageLocked, setColdMessageLocked] = useState(false);
  const [savedItems, setSavedItems] = useState<Creator[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [followerBucket, setFollowerBucket] = useState(0);
  const [minEngagement, setMinEngagement] = useState("");

  useEffect(() => {
    fetch("/api/me/account-type", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setIsPro(d.verifiedTier === "brand_verified"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/social/saved", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.items) {
          setSavedItems(d.items);
          setSavedIds(new Set(d.items.map((c: Creator) => c.id)));
        }
      })
      .catch(() => {});
  }, []);

  async function toggleSave(creatorId: string) {
    const currentlySaved = savedIds.has(creatorId);
    // Optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (currentlySaved) next.delete(creatorId); else next.add(creatorId);
      return next;
    });
    const res = await fetch("/api/social/saved", {
      method: currentlySaved ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId }),
      credentials: "include",
    });
    if (!res.ok) {
      // Revert on failure
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (currentlySaved) next.add(creatorId); else next.delete(creatorId);
        return next;
      });
      return;
    }
    // Keep the saved list in sync for the "Saved" view
    if (currentlySaved) {
      setSavedItems((prev) => prev.filter((c) => c.id !== creatorId));
    } else {
      const creator = creators.find((c) => c.id === creatorId);
      if (creator && !savedItems.some((c) => c.id === creatorId)) {
        setSavedItems((prev) => [creator, ...prev]);
      }
    }
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (niche !== "All") params.set("niche", niche);
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (isPro) {
      const b = FOLLOWER_BUCKETS[followerBucket];
      if (b.min) params.set("minFollowers", b.min);
      if (b.max) params.set("maxFollowers", b.max);
      if (minEngagement) params.set("minEngagement", minEngagement);
    }
    fetch(`/api/social/creators?${params}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setCreators(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [niche, debouncedSearch, isPro, followerBucket, minEngagement]);

  async function startConversation(creatorId: string) {
    setColdMessageLocked(false);
    const res = await fetch("/api/social/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otherUserId: creatorId }),
      credentials: "include",
    });
    if (res.status === 403) {
      const d = await res.json().catch(() => ({}));
      if (d.code === "cold_message_locked") {
        setColdMessageLocked(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }
    if (res.ok) {
      const d = await res.json();
      router.push(`/messages?convo=${d.conversationId}`);
    }
  }

  return (
    <WorkspaceShell variant="brand" width="wide">
        <PageHeader eyebrow="Discover" title="Find creators" description="Live media kits with verified stats. Save the ones you like, message them, or invite them to a campaign." />
        {coldMessageLocked && (
          <div className="mb-6 rounded-2xl border border-[#7c3aed]/40 bg-[#7c3aed]/5 px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <VerifiedBadge tier="brand_verified" size="md" />
              <div>
                <p className="text-sm font-semibold text-foreground">Messaging creators directly is a Brand Pro feature</p>
                <p className="text-xs text-muted-foreground mt-0.5">Upgrade to reach any creator — not just those who applied to your campaigns.</p>
              </div>
            </div>
            <Link
              href="/settings"
              className="shrink-0 h-9 px-4 inline-flex items-center rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-80 transition-opacity"
            >
              Upgrade
            </Link>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creators by name, handle, or bio…"
            className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShowSavedOnly((v) => !v)}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              showSavedOnly ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={showSavedOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Saved{savedIds.size > 0 ? ` (${savedIds.size})` : ""}
          </button>
        </div>
        {!showSavedOnly && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {isPro ? (
              <>
                <span className="text-xs text-muted-foreground mr-0.5">Filter:</span>
                <select
                  value={followerBucket}
                  onChange={(e) => setFollowerBucket(Number(e.target.value))}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {FOLLOWER_BUCKETS.map((b, i) => <option key={b.label} value={i}>{b.label}</option>)}
                </select>
                <select
                  value={minEngagement}
                  onChange={(e) => setMinEngagement(e.target.value)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {ENGAGEMENT_OPTS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
                </select>
              </>
            ) : (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#7c3aed]/40 bg-[#7c3aed]/5 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-[#7c3aed]/10 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Filter by followers &amp; engagement · Brand Pro
              </Link>
            )}
          </div>
        )}

        {!showSavedOnly && (
          <div className="flex gap-2 flex-wrap mb-8">
            {NICHES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNiche(n)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  niche === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        )}

        {showSavedOnly ? (
          savedItems.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-muted-foreground text-sm">No saved creators yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Tap the bookmark on a creator to build your shortlist.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {savedItems.map((c) => <CreatorCard key={c.id} creator={c} onMessage={startConversation} isSaved={savedIds.has(c.id)} onToggleSave={toggleSave} />)}
            </div>
          )
        ) : loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <CreatorCardSkeleton key={i} />)}
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground text-sm">No creators found. Try a different niche or search.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {creators.map((c) => <CreatorCard key={c.id} creator={c} onMessage={startConversation} isSaved={savedIds.has(c.id)} onToggleSave={toggleSave} />)}
          </div>
        )}
    </WorkspaceShell>
  );
}
