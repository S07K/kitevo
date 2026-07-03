"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppNav } from "@/app/components/AppNav";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { signOut } from "next-auth/react";

const NICHES = [
  "All", "Fashion", "Beauty", "Food", "Tech", "Health", "Travel",
  "Fitness", "Lifestyle", "Gaming", "Parenting", "Finance", "Education",
];

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

function CreatorCard({ creator, onMessage }: { creator: Creator; onMessage: (id: string) => void }) {
  const initials = (creator.name ?? creator.username ?? "?").charAt(0).toUpperCase();
  return (
    <div className="bg-background border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
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
              <span key={n} className="text-[10px] font-medium bg-muted text-muted-foreground rounded-full px-2 py-0.5">{n}</span>
            ))}
          </div>
        )}
        {creator.location && <p className="mt-2 text-xs text-muted-foreground">📍 {creator.location}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onMessage(creator.id)}
            className="flex-1 inline-flex justify-center h-8 items-center rounded-full bg-foreground text-background text-xs font-medium hover:opacity-80 transition-opacity"
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (niche !== "All") params.set("niche", niche);
    if (debouncedSearch) params.set("q", debouncedSearch);
    fetch(`/api/social/creators?${params}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setCreators(d.items ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [niche, debouncedSearch]);

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
      <AppNav
        links={[{ href: "/profile", label: "Settings" }]}
        onLogout={async () => {
          await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
          signOut({ callbackUrl: "/" });
        }}
        tabs={[
          { href: "/brand", label: "Discover" },
          { href: "/brand/campaigns", label: "Campaigns" },
          { href: "/brand/inbox", label: "Inbox" },
        ]}
      />

      <main className="mx-auto max-w-6xl px-5 pt-24 pb-16 sm:px-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creators by name, handle, or bio…"
            className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2 flex-wrap mb-8">
          {NICHES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNiche(n)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                niche === n ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-64 rounded-2xl border border-border bg-muted animate-pulse" />)}
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground text-sm">No creators found. Try a different niche or search.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {creators.map((c) => <CreatorCard key={c.id} creator={c} onMessage={startConversation} />)}
          </div>
        )}
      </main>
    </div>
  );
}
