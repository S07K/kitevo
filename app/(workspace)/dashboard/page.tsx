"use client";

import { useState, useEffect, useCallback, Suspense, type ReactNode } from "react";
import { INSTAGRAM_ERROR_MESSAGES } from "@/lib/connect-messages";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { type PlatformStatsWithCharts } from "@/lib/platforms";
import type { AccountProfile } from "@/lib/profile-types";
import { DashboardSkeleton, KitSpotlightSkeleton, MetricsSkeleton, ActivitySkeleton, PanelSkeleton, Skeleton, CountUp } from "@/app/components/Skeleton";
import { AnalyticsChart } from "@/app/components/AnalyticsChart";
import type { KitRecord } from "@/lib/kit-storage";
import { type InquiryRecord } from "@/app/components/DealPipeline";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { ReferralCard } from "./ReferralCard";
import { WorkspaceShell, PageHeader, SectionTitle, Eyebrow } from "@/app/components/workspace/WorkspaceShell";
import { Button, ButtonLink } from "@/app/components/workspace/Button";
import { Modal } from "@/app/components/workspace/Modal";
import { KitSpotlight, SetupChecklist, OpportunitiesPanel, ConnectionsPanel, PlanPanel, InquiriesPanel } from "./WorkspaceWidgets";
import { KitActionsMenu, vibeFor } from "./KitActions";
import { CreateKitModal } from "./CreateKitModal";
import { hasPublicRates } from "@/lib/kit-rates";

// ─── Types ───────────────────────────────────────────────────────────────────

interface KitViewRecord {
  id: string;
  viewedAt: string;
  referrer: string | null;
  kit: { id: string; name: string; slug: string };
}

type DashboardKit = KitRecord & { appearance?: { preset?: string }; hasPassword?: boolean };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function referrerDomain(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}


/** Status banner (connect results, payment). Same place and style for every source. */
function Notice({ tone, children }: { tone: "success" | "warning" | "danger"; children: ReactNode }) {
  const cls = {
    success: "border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300",
    warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300",
    danger: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
  }[tone];
  return (
    <div role={tone === "success" ? "status" : "alert"} className={`mb-6 rounded-xl border p-4 text-sm ${cls}`}>
      {children}
    </div>
  );
}

// ─── Kit card (secondary kits; the main kit lives in KitSpotlight) ──────────

function KitCard({
  kit,
  onDelete,
  onSlugChange,
  onPasswordChange,
}: {
  kit: DashboardKit;
  onDelete: () => void;
  onSlugChange: (id: string, newSlug: string) => void;
  onPasswordChange: (id: string, hasPassword: boolean) => void;
}) {
  const vibe = vibeFor(kit);
  return (
    <div className="border-border bg-background rounded-2xl border transition-shadow duration-200 hover:shadow-md">
      <div className="relative flex h-28 items-center justify-center rounded-t-2xl px-5" style={{ backgroundColor: vibe.bg, color: vibe.fg }}>
        <span className="absolute left-4 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: vibe.fg + "1f" }}>
          {vibe.label}
        </span>
        <span className="absolute right-4 top-3 flex items-center gap-1.5">
          {kit.hasPassword && (
            <span className="rounded-full px-2 py-1 text-[11px] font-medium" style={{ backgroundColor: vibe.fg + "1f" }}>
              Private
            </span>
          )}
          <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ backgroundColor: vibe.fg + "1f" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden /> Live
          </span>
        </span>
        <p className="font-display px-10 text-center text-xl font-semibold leading-tight">{kit.name}</p>
      </div>
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground truncate font-mono text-xs">/kit/{kit.slug}</p>
          {typeof kit.viewCount === "number" && (
            <p className="text-muted-foreground mt-0.5 text-xs">
              {kit.viewCount.toLocaleString()} view{kit.viewCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <ButtonLink href={`/kit/edit?id=${encodeURIComponent(kit.id)}`} size="sm">
          Edit
        </ButtonLink>
        <KitActionsMenu kit={kit} onDelete={onDelete} onSlugChange={onSlugChange} onPasswordChange={onPasswordChange} />
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

function DashboardContent() {
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [allowedKits, setAllowedKits] = useState(1);
  const [tierId, setTierId] = useState<string | null>(null);
  const [tierName, setTierName] = useState<string | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [greeting, setGreeting] = useState({ hello: "Welcome back", today: "" });
  const isPaidTier = !!tierId && tierId !== "free";
  const [kits, setKits] = useState<DashboardKit[]>([]);
  const [kitsLoaded, setKitsLoaded] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const router = useRouter();
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState<Record<string, PlatformStatsWithCharts> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [kitToDelete, setKitToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [inquiriesLoaded, setInquiriesLoaded] = useState(false);
  const [kitViews, setKitViews] = useState<KitViewRecord[]>([]);
  const [kitViewsThisWeek, setKitViewsThisWeek] = useState(0);
  const [kitViewsTotal, setKitViewsTotal] = useState(0);
  const [kitViewsDaily, setKitViewsDaily] = useState<{ date: string; count: number }[]>([]);
  const [kitViewsReferrers, setKitViewsReferrers] = useState<{ source: string; count: number }[]>([]);
  const [kitViewsByKit, setKitViewsByKit] = useState<{ id: string; name: string; slug: string; count: number }[]>([]);
  const [kitViewsTrend, setKitViewsTrend] = useState<number | null>(null);
  const [kitViewsDays, setKitViewsDays] = useState(30);
  const [kitViewsLoaded, setKitViewsLoaded] = useState(false);
  const [disconnectingInstagram, setDisconnectingInstagram] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeStats, setYoutubeStats] = useState<{ subscriberCount: number; viewCount: number; videoCount: number; channelTitle: string } | null>(null);
  const [disconnectingYoutube, setDisconnectingYoutube] = useState(false);
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const sessionId = searchParams.get("session_id") ?? null;
  // Dodo returns subscription_id instead of a session id (see /api/subscription-status).
  const returnedSubscriptionId = searchParams.get("subscription_id") ?? null;
  const instagramConnectedParam = searchParams.get("instagram_connected");
  const instagramErrorParam = searchParams.get("instagram_error");
  const youtubeParam = searchParams.get("youtube");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const body = {
        ...(sessionId && sessionId !== "{CHECKOUT_SESSION_ID}" ? { session_id: sessionId } : {}),
        ...(returnedSubscriptionId ? { subscription_id: returnedSubscriptionId } : {}),
      };
      const res = await fetch("/api/subscription-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (cancelled) return;
      const data = await res.json().catch(() => ({}));
      // Access, not payment: a comp grants the paid tier with hasSubscription=false, so gate
      // paid features on the effective tier. Every authenticated user reaches the dashboard;
      // the Free plan includes one kit.
      setAllowedKits(typeof data.allowedKits === "number" ? data.allowedKits : 1);
      setTierId(data.tierId ?? null);
      setTierName(data.tierName ?? null);
      setHasSubscription(data.hasSubscription === true);
      setSubscriptionLoaded(true);
    }
    check();
    return () => { cancelled = true; };
  }, [sessionId, returnedSubscriptionId]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/kits", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data !== null) setKits(Array.isArray(data) ? data : []);
        setKitsLoaded(true);
      })
      .catch(() => { if (!cancelled) setKitsLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  const fetchKitViews = useCallback((days: number) => {
    fetch(`/api/kit-views?days=${days}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setKitViews(Array.isArray(data.views) ? data.views : []);
        setKitViewsThisWeek(typeof data.thisWeek === "number" ? data.thisWeek : 0);
        setKitViewsTotal(typeof data.total === "number" ? data.total : 0);
        setKitViewsDaily(Array.isArray(data.daily) ? data.daily : []);
        setKitViewsReferrers(Array.isArray(data.referrers) ? data.referrers : []);
        setKitViewsByKit(Array.isArray(data.byKit) ? data.byKit : []);
        setKitViewsTrend(typeof data.trend === "number" ? data.trend : null);
        setKitViewsLoaded(true);
      })
      .catch(() => setKitViewsLoaded(true));
  }, []);

  // Kit views don't depend on the plan: start on mount, in parallel with everything else.
  useEffect(() => {
    fetchKitViews(kitViewsDays);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inquiries feed the rail summary + status line; the full pipeline lives at /pipeline.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/inquiries", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) { setInquiries(Array.isArray(data) ? data : []); setInquiriesLoaded(true); }
      })
      .catch(() => { if (!cancelled) setInquiriesLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  // Old links to the dashboard's inbox tab (/dashboard#inbox) now open the pipeline.
  useEffect(() => {
    if (window.location.hash === "#inbox") router.replace("/pipeline");
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) { setProfile(data); setProfileLoaded(true); }
      })
      .catch(() => {
        if (!cancelled) { setProfile(null); setProfileLoaded(true); }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!profileLoaded || profile === null) return;
    if (profile.onboardingCompletedAt == null || profile.onboardingCompletedAt === "") {
      router.replace("/onboarding");
      return;
    }
    // Brand accounts have their own dashboard
    if ((profile as { accountType?: string }).accountType === "brand") {
      router.replace("/discover");
    }
  }, [profileLoaded, profile, router]);

  useEffect(() => {
    // Only the profile gates the page (onboarding redirect + greeting). The plan check can
    // hit the payment provider, so plan-dependent sections wait for it on their own.
    if (!profileLoaded) return;
    if (profile !== null && (profile.onboardingCompletedAt == null || profile.onboardingCompletedAt === "")) return;
    setLoading(false);
  }, [profileLoaded, profile]);

  useEffect(() => {
    if (!subscriptionLoaded) return; // metrics keep their skeleton until the plan is known
    if (!isPaidTier) {
      // Free kits use creator-reported stats. Never fetch live platform data for them.
      setPlatformStats({});
      return;
    }
    let cancelled = false;
    fetch("/api/instagram/stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((stats) => {
        if (!cancelled) setPlatformStats(stats ? { instagram: stats } : {});
      })
      .catch(() => { if (!cancelled) setPlatformStats({}); });
    return () => { cancelled = true; };
  }, [isPaidTier, subscriptionLoaded]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/instagram/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setInstagramConnected(data.connected === true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [instagramConnectedParam]);

  // Connection status is independent of the plan: a free creator's token exists, so the
  // Integrations row must still offer Disconnect. Only the live numbers are Starter+.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/youtube/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.connected === "boolean") setYoutubeConnected(data.connected);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [youtubeParam]);

  useEffect(() => {
    // Live YouTube stats are Starter+. Free accounts must not rely on them.
    if (!isPaidTier) {
      setYoutubeStats(null);
      return;
    }
    let cancelled = false;
    fetch("/api/youtube/stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) {
          setYoutubeStats(data ?? null);
          setYoutubeConnected(!!data?.channelId);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isPaidTier, youtubeParam]);

  const handleDisconnectYoutube = async () => {
    setDisconnectingYoutube(true);
    try {
      const res = await fetch("/api/youtube/disconnect", { method: "POST", credentials: "include" });
      if (res.ok) { setYoutubeConnected(false); setYoutubeStats(null); }
    } finally {
      setDisconnectingYoutube(false);
    }
  };

  const handleDisconnectInstagram = async () => {
    setDisconnectingInstagram(true);
    try {
      const res = await fetch("/api/instagram/disconnect", { method: "POST", credentials: "include" });
      if (res.ok) setInstagramConnected(false);
    } finally {
      setDisconnectingInstagram(false);
    }
  };

  const instagramErrorMessages = INSTAGRAM_ERROR_MESSAGES;



  const deleteKit = async () => {
    if (!kitToDelete) return;
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/kits/${kitToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setKits((prev) => prev.filter((k) => k.id !== kitToDelete.id));
        setKitToDelete(null);
      } else {
        setDeleteError("Failed to delete kit. Try again.");
      }
    } catch {
      setDeleteError("Something went wrong. Try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; return; }
      alert(data.error || "Could not open billing portal.");
    } catch {
      alert("Something went wrong.");
    } finally {
      setPortalLoading(false);
    }
  };

  const upgradeToProLoading = upgradeLoading;
  const upgradeToPro = async () => {
    setUpgradeLoading(true);
    try {
      const res = await fetch("/api/upgrade-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: "pro" }),
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const statusRes = await fetch("/api/subscription-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
          credentials: "include",
        });
        const statusData = await statusRes.json();
        setTierId(statusData.tierId ?? null);
        setTierName(statusData.tierName ?? null);
        setAllowedKits(statusData.allowedKits ?? 1);
      } else {
        alert(data.error || "Upgrade failed");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setUpgradeLoading(false);
    }
  };

  // Time-of-day greeting + date, computed on the client only (no SSR/locale mismatch).
  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setGreeting({
      hello: h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening",
      today: now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }),
    });
  }, []);

  // Derived helpers
  const firstName = profile?.name?.split(" ")[0] ?? "there";
  const avatarUrl = profile?.avatarUrl ?? null;
  const instagramStats = platformStats?.["instagram"] ?? null;
  // Free plans: self-reported headline numbers (entered in KitEditor) stand in for live stats.
  const manual = kits[0]?.manualStats;
  const mainKit = kits[0] ?? null;
  const otherKits = kits.slice(1);
  const unreadInquiries = inquiries.filter((i) => !i.read).length;
  const anyConnected = instagramConnected || youtubeConnected;
  const scrollToConnections = () =>
    document.getElementById("integrations")?.scrollIntoView({ behavior: "smooth", block: "center" });
  const renameKit = (id: string, slug: string) => setKits((prev) => prev.map((k) => (k.id === id ? { ...k, slug } : k)));
  const setKitPassword = (id: string, hasPassword: boolean) =>
    setKits((prev) => prev.map((k) => (k.id === id ? { ...k, hasPassword } : k)));
  const askDelete = (kit: { id: string; name: string }) => {
    setDeleteError(null);
    setKitToDelete({ id: kit.id, name: kit.name });
  };

  // One status line under the greeting: what changed, not a tagline.
  const statusLine = (() => {
    if (kitsLoaded && kits.length === 0) return "Create your kit to start collecting views and inquiries.";
    if (!kitViewsLoaded) return "Your kit, your numbers and your next opportunities.";
    const parts = [
      kitViewsThisWeek > 0
        ? `${kitViewsThisWeek.toLocaleString()} view${kitViewsThisWeek === 1 ? "" : "s"} on your kit this week`
        : "No views this week yet. Share your kit link to get some",
    ];
    if (unreadInquiries > 0) parts.push(`${unreadInquiries} unread inquir${unreadInquiries === 1 ? "y" : "ies"}`);
    return parts.join(" · ") + ".";
  })();

  const checklist = (
    <SetupChecklist
      items={[
        ...(kits.length === 0
          ? [{ id: "kit", label: "Create your media kit", done: false, cta: "Create", onClick: () => setCreateOpen(true) }]
          : []),
        // Profile lives in the kit editor's Profile card (no kit yet: create one first).
        ...[
          { id: "photo", label: "Add a profile photo", done: !!avatarUrl, cta: "Add" },
          { id: "bio", label: "Write a short bio", done: !!profile?.bio, cta: "Write" },
          { id: "niches", label: "Pick your niches", done: (profile?.niches?.length ?? 0) > 0, cta: "Pick" },
        ].map((item) =>
          mainKit
            ? { ...item, href: `/kit/edit?id=${encodeURIComponent(mainKit.id)}&section=profile` }
            : { ...item, onClick: () => setCreateOpen(true) },
        ),
        { id: "connect", label: "Connect Instagram or YouTube", done: anyConnected, cta: "Connect", onClick: scrollToConnections },
        ...(mainKit
          ? [
              { id: "rates", label: "Add your rates", done: hasPublicRates(mainKit.rates), href: `/kit/edit?id=${encodeURIComponent(mainKit.id)}`, cta: "Add" },
              {
                id: "share",
                label: "Share your kit with a brand",
                done: kitViewsTotal > 0,
                cta: "Copy link",
                feedback: "Copied",
                onClick: () => navigator.clipboard?.writeText(`${window.location.origin}/kit/${mainKit.slug}`).catch(() => {}),
              },
            ]
          : []),
      ]}
    />
  );

  // ── Audience numbers: only tiles with real data; no data → one honest prompt ──
  const metrics = (() => {
    if (!platformStats) return <MetricsSkeleton />;
    type Tile = { key: string; label: string; sub: string; node: ReactNode };
    const tiles: Tile[] = [];
    const manualFollowers = !instagramStats && manual?.instagramFollowers ? manual.instagramFollowers : null;
    if (instagramStats || manualFollowers) {
      tiles.push({
        key: "followers",
        label: "Followers",
        sub: instagramStats ? "Instagram" : "Instagram · self-reported",
        node: <CountUp value={instagramStats ? instagramStats.followers : (manualFollowers ?? 0)} duration={1400} />,
      });
    }
    if (youtubeStats || manual?.youtubeSubscribers) {
      tiles.push({
        key: "subs",
        label: "Subscribers",
        sub: youtubeStats ? "YouTube" : "YouTube · self-reported",
        node: <CountUp value={youtubeStats ? youtubeStats.subscriberCount : (manual?.youtubeSubscribers ?? 0)} duration={1400} />,
      });
    }
    // Only show engagement when it's a real, non-zero rate (0.0% reads as "no engagement").
    if (instagramStats && instagramStats.avgEngagement > 0) {
      tiles.push({ key: "eng", label: "Engagement", sub: "Instagram · avg rate", node: <CountUp value={instagramStats.avgEngagement} decimals={1} suffix="%" duration={1000} /> });
    } else if (manual?.instagramEngagement) {
      tiles.push({ key: "eng", label: "Engagement", sub: "avg rate · self-reported", node: <CountUp value={manual.instagramEngagement} decimals={1} suffix="%" duration={1000} /> });
    }

    if (tiles.length === 0) {
      const editHref = mainKit ? `/kit/edit?id=${encodeURIComponent(mainKit.id)}` : null;
      return (
        <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border bg-background p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <SectionTitle as="h3">Show brands your audience</SectionTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {anyConnected && !isPaidTier
                ? "You're connected. Live numbers are a Starter feature; until then, add self-reported numbers in the kit editor."
                : anyConnected
                  ? "Your live numbers couldn't be loaded right now. They'll appear here once your account syncs."
                  : "Connect Instagram or YouTube for live numbers, or add self-reported ones in the kit editor."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {!anyConnected && (
              <Button onClick={scrollToConnections}>Connect</Button>
            )}
            {anyConnected && !isPaidTier && (
              <ButtonLink href="/pricing?plan=starter">See Starter</ButtonLink>
            )}
            {editHref && (
              <ButtonLink href={editHref} variant="ghost">
                Add numbers
              </ButtonLink>
            )}
          </div>
        </div>
      );
    }

    const cols = tiles.length === 1 ? "grid-cols-1" : tiles.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3";
    return (
      <div className={`grid gap-px overflow-hidden rounded-2xl border border-border bg-border ${cols}`}>
        {tiles.map((t) => (
          <div key={t.key} className="bg-background px-6 py-5">
            <Eyebrow className="mb-2">{t.label}</Eyebrow>
            <div className="font-display text-foreground text-2xl font-semibold leading-none tracking-tight tabular-nums">{t.node}</div>
            <p className="text-muted-foreground mt-1.5 text-xs">{t.sub}</p>
          </div>
        ))}
      </div>
    );
  })();

  const showActivity = kits.length > 0;

  const youtubeNotice =
    youtubeParam === "connected" ? (
      <Notice tone="success">YouTube connected. Your subscribers and videos will now load from your channel.</Notice>
    ) : youtubeParam === "error" ? (
      <Notice tone="danger">YouTube connection failed. Please try again.</Notice>
    ) : youtubeParam === "no_channel" ? (
      <Notice tone="danger">No YouTube channel found on this Google account.</Notice>
    ) : null;

  return (
    <WorkspaceShell variant="creator" width="wide">
      <CreateKitModal open={createOpen} onClose={() => setCreateOpen(false)} isFirst={kits.length === 0} allowedKits={allowedKits} />
      <Modal
        open={!!kitToDelete}
        onClose={() => {
          setKitToDelete(null);
          setDeleteError(null);
        }}
        dismissible={!deleteLoading}
        title="Delete kit?"
        description={kitToDelete ? `“${kitToDelete.name}” will be permanently removed. This cannot be undone.` : undefined}
      >
        {deleteError && <p className="mb-3 text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
        <div className="flex justify-end gap-2">
          <Button
            disabled={deleteLoading}
            onClick={() => {
              setKitToDelete(null);
              setDeleteError(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="danger" disabled={deleteLoading} onClick={deleteKit}>
            {deleteLoading ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>

      {/* ── Status banners: every connect/payment result lands here ── */}
      {success && <Notice tone="success">Payment successful! Your media kit is now live.</Notice>}
      {instagramConnectedParam === "1" && (
        <Notice tone="success">Instagram connected. Your stats and posts will now load from your account.</Notice>
      )}
      {instagramErrorParam && (
        <Notice tone="warning">
          <p>{instagramErrorMessages[instagramErrorParam] ?? `Instagram: ${instagramErrorParam}`}</p>
          <Link href="/help/instagram" className="mt-2 inline-block text-sm font-medium underline underline-offset-4 hover:no-underline">
            See connection help
          </Link>
        </Notice>
      )}
      {youtubeNotice}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div>
          <PageHeader
            eyebrow={greeting.today || "Your workspace"}
            title={
              <span className="inline-flex items-center gap-2">
                {greeting.hello}, {firstName}
                <VerifiedBadge tier={profile?.verifiedTier} size="md" />
              </span>
            }
            description={statusLine}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            {/* ── Main column ── */}
            <div className="min-w-0 space-y-8 lg:col-span-2">
              {!kitsLoaded ? (
                <KitSpotlightSkeleton />
              ) : mainKit ? (
                <KitSpotlight
                  kit={mainKit}
                  name={profile?.name ?? ""}
                  avatarUrl={avatarUrl}
                  niches={profile?.niches ?? []}
                  viewsThisWeek={kitViewsThisWeek}
                  viewsLoaded={kitViewsLoaded}
                  kitCount={kits.length}
                  verifiedTier={profile?.verifiedTier}
                  menu={
                    <KitActionsMenu
                      kit={mainKit}
                      onDelete={() => askDelete(mainKit)}
                      onSlugChange={renameKit}
                      onPasswordChange={setKitPassword}
                    />
                  }
                />
              ) : null}

              <div className="lg:hidden">{checklist}</div>

              {metrics}

              {/* ── Activity (the deal pipeline has its own tab: /pipeline) ── */}
              {showActivity && (
                <section id="activity">
                  <div className="mb-4">
                    <SectionTitle>Activity</SectionTitle>
                  </div>
                  {!kitViewsLoaded && (
                    <div className="h-[260px]" aria-hidden>
                      <Skeleton className="h-full w-full rounded-2xl" />
                    </div>
                  )}
                  {kitViewsLoaded && (
                    <div>
                      {kitViewsTotal === 0 ? (
                        <div className="border-border rounded-2xl border border-dashed p-8 text-center">
                          <p className="text-foreground text-sm font-semibold">No views yet</p>
                          <p className="text-muted-foreground mt-1 text-sm">Share your kit link and views will appear here in real time.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <AnalyticsChart
                            daily={kitViewsDaily}
                            referrers={kitViewsReferrers}
                            byKit={kitViewsByKit}
                            total={kitViewsTotal}
                            trend={kitViewsTrend}
                            days={kitViewsDays}
                            inquiryCount={inquiries.length}
                            wonCount={inquiries.filter((i) => i.status === "won").length}
                            onDaysChange={(d) => {
                              setKitViewsDays(d);
                              fetchKitViews(d);
                            }}
                          />
                          <div className="bg-background border-border overflow-hidden rounded-2xl border">
                            <div className="px-5 pb-3 pt-5">
                              <SectionTitle as="h3">Recent visits</SectionTitle>
                            </div>
                            <ul className="divide-border divide-y">
                              {kitViews.slice(0, 10).map((view) => {
                                const domain = referrerDomain(view.referrer);
                                return (
                                  <li key={view.id} className="flex items-center justify-between gap-4 px-5 py-3">
                                    <div className="min-w-0">
                                      <p className="text-foreground truncate text-sm font-medium">{view.kit.name}</p>
                                      {domain && <p className="text-muted-foreground mt-0.5 truncate text-xs">via {domain}</p>}
                                    </div>
                                    <p className="text-muted-foreground shrink-0 text-xs">{timeAgo(view.viewedAt)}</p>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* ── Kits: the main kit is the spotlight; this lists the rest, or creates the first ── */}
              {kitsLoaded && (
                <section id="kits" className="scroll-mt-24">
                  {subscriptionLoaded && kits.length === 0 && allowedKits === 0 && (
                    <div className="border-border max-w-md rounded-2xl border border-dashed p-8 text-center">
                      <p className="text-foreground text-base font-semibold">Choose a plan to get started</p>
                      <p className="text-muted-foreground mt-1 text-sm">Pick a plan and create your first media kit in minutes.</p>
                      <ButtonLink href="/pricing" variant="primary" size="lg" className="mt-5">
                        View plans
                      </ButtonLink>
                    </div>
                  )}

                  {subscriptionLoaded && kits.length === 0 && allowedKits > 0 && (
                    <div className="border-border bg-background flex flex-col items-start gap-4 rounded-2xl border border-dashed p-6 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <SectionTitle>Create your first kit</SectionTitle>
                        <p className="text-muted-foreground mt-1 text-sm">
                          Name it, pick its link, then add your stats and rates in the editor.
                        </p>
                      </div>
                      <Button variant="primary" onClick={() => setCreateOpen(true)}>
                        <Plus size={14} aria-hidden /> Create kit
                      </Button>
                    </div>
                  )}

                  {otherKits.length > 0 && (
                    <>
                      <div className="mb-4 flex items-center justify-between">
                        <SectionTitle>Other kits</SectionTitle>
                        {subscriptionLoaded && kits.length < allowedKits && (
                          <Button size="sm" onClick={() => setCreateOpen(true)}>
                            <Plus size={14} aria-hidden /> New kit
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {otherKits.map((kit) => (
                          <KitCard
                            key={kit.id}
                            kit={kit}
                            onDelete={() => askDelete(kit)}
                            onSlugChange={renameKit}
                            onPasswordChange={setKitPassword}
                          />
                        ))}
                      </div>
                      {subscriptionLoaded && kits.length >= allowedKits && (
                        <p className="text-muted-foreground mt-4 text-sm">
                          You&apos;re using all {allowedKits} kits on your plan.{" "}
                          <Link href="/pricing" className="text-foreground underline underline-offset-4 hover:no-underline">
                            Upgrade for more
                          </Link>
                          .
                        </p>
                      )}
                    </>
                  )}

                  {/* One kit with room for more: a quiet prompt, not a second copy of the kit */}
                  {subscriptionLoaded && kits.length === 1 && kits.length < allowedKits && (
                    <div className="border-border flex flex-col gap-3 rounded-2xl border border-dashed p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <SectionTitle as="h3">Add another kit</SectionTitle>
                        <p className="text-muted-foreground mt-1 text-sm">
                          Your plan includes {allowedKits} kits. Make one per niche, language or audience.
                        </p>
                      </div>
                      <Button onClick={() => setCreateOpen(true)}>
                        <Plus size={14} aria-hidden /> New kit
                      </Button>
                    </div>
                  )}

                </section>
              )}
            </div>

            {/* ── Right rail ── */}
            <aside className="min-w-0 space-y-6">
              <div className="hidden lg:block">{checklist}</div>

              {/* Inquiries come from the Pro-only kit contact form; show the card to Pro creators,
                  or to anyone who already has inquiries (e.g. after a downgrade). */}
              {(tierId === "pro" || inquiries.length > 0) && <InquiriesPanel inquiries={inquiries} loaded={inquiriesLoaded} />}

              <OpportunitiesPanel niches={profile?.niches ?? []} />

              <ConnectionsPanel
                instagram={{ connected: instagramConnected, detail: instagramConnected ? "Connected · stats syncing" : undefined }}
                youtube={{
                  connected: youtubeConnected,
                  detail: youtubeConnected && youtubeStats ? `${youtubeStats.channelTitle} · ${youtubeStats.subscriberCount.toLocaleString()} subscribers` : undefined,
                }}
                isPaidTier={isPaidTier}
                onDisconnectInstagram={handleDisconnectInstagram}
                onDisconnectYoutube={handleDisconnectYoutube}
                busy={{ instagram: disconnectingInstagram, youtube: disconnectingYoutube }}
              />

              {!subscriptionLoaded ? (
                <PanelSkeleton rows={1} titleWidth="w-10" />
              ) : (
              <PlanPanel
                tierId={tierId}
                tierName={tierName}
                kitsUsed={kits.length}
                kitsAllowed={allowedKits}
                onManageBilling={hasSubscription ? openPortal : null}
                managing={portalLoading}
                onUpgradeToPro={upgradeToPro}
                upgrading={upgradeToProLoading}
              />
              )}

              <ReferralCard compact />
            </aside>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <WorkspaceShell variant="creator" width="wide">
          <DashboardSkeleton />
        </WorkspaceShell>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
