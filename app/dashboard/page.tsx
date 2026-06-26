"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { SubscribeButton } from "../components/SubscribeButton";
import {
  getEnabledPlatformIds,
  getPlatformMeta,
  type PlatformId,
  type PlatformStatsWithCharts,
} from "@/lib/platforms";
import { AppNav } from "../components/AppNav";
import { ProfileForm, type ProfileFormProfile } from "../components/ProfileForm";
import { DashboardSkeleton, StatCardSkeleton, KitCardSkeleton, CountUp } from "../components/Skeleton";
import type { KitRecord } from "@/lib/kit-storage";
import type { ProfilePayload } from "@/app/api/me/profile/route";

// ─── Types ───────────────────────────────────────────────────────────────────

interface KitViewRecord {
  id: string;
  viewedAt: string;
  referrer: string | null;
  kit: { id: string; name: string; slug: string };
}

interface InquiryRecord {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  createdAt: string;
  read: boolean;
  kit: { id: string; name: string; slug: string };
}

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

// ─── Design system primitives ────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-background border-border rounded-2xl border p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mb-4 text-[11px] font-semibold tracking-[0.16em] uppercase">
      {children}
    </p>
  );
}

function PrimaryBtn({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`bg-foreground text-background inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-flex h-10 items-center rounded-full border px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

// ─── Vibe accent color map ────────────────────────────────────────────────────

const VIBE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  editorial: { bg: "#111110", fg: "#f5f0e8", label: "Editorial" },
  studio:    { bg: "#e8e6e1", fg: "#2d2d2b", label: "Studio" },
  noir:      { bg: "#1a1a18", fg: "#c9a84c", label: "Noir" },
  bloom:     { bg: "#f5ede4", fg: "#c97b4b", label: "Bloom" },
  electric:  { bg: "#0d0d1a", fg: "#6366f1", label: "Electric" },
  // Legacy presets
  warm:      { bg: "#F5F3F0", fg: "#1A1A1A", label: "Warm" },
  cool:      { bg: "#F0F3F7", fg: "#1E3A5F", label: "Cool" },
  paper:     { bg: "#FAFAF8", fg: "#111111", label: "Paper" },
};

// ─── Kit card ────────────────────────────────────────────────────────────────

function KitCard({
  kit,
  onDelete,
}: {
  kit: KitRecord & { appearance?: { preset?: string } };
  onDelete: () => void;
}) {
  const preset = (kit as { appearance?: { preset?: string } }).appearance?.preset ?? "warm";
  const vibe = VIBE_COLORS[preset] ?? VIBE_COLORS.warm;
  const [exporting, setExporting] = useState(false);

  async function downloadPdf() {
    setExporting(true);
    try {
      const res = await fetch(`/api/kits/${kit.id}/export`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kit.slug}-media-kit.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent — could show a toast here
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="border-border bg-background group relative overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      {/* Vibe color strip — taller, with centered name and live badge */}
      <div
        className="relative flex h-28 items-center justify-center px-5"
        style={{ backgroundColor: vibe.bg }}
      >
        {/* Top-left: vibe label */}
        <span
          className="absolute left-4 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide"
          style={{ backgroundColor: vibe.fg + "22", color: vibe.fg, border: `1px solid ${vibe.fg}33` }}
        >
          {vibe.label}
        </span>
        {/* Top-right: live indicator */}
        <span
          className="absolute right-4 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide opacity-80"
          style={{ backgroundColor: vibe.fg + "18", color: vibe.fg }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live
        </span>
        {/* Kit name centered */}
        <p
          className="font-display text-xl font-semibold text-center px-10 leading-tight"
          style={{ color: vibe.fg }}
        >
          {kit.name}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 px-5 py-3">
        <p className="text-muted-foreground text-xs">/kit/{kit.slug}</p>
        {typeof kit.viewCount === "number" && (
          <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2.5 py-1 text-xs font-medium">
            {kit.viewCount === 0 ? "0 views" : `${kit.viewCount} view${kit.viewCount !== 1 ? "s" : ""}`}
          </span>
        )}
      </div>

      <div className="border-border flex items-center gap-1.5 border-t px-4 py-3">
        <Link
          href={`/kit/edit?id=${encodeURIComponent(kit.id)}`}
          className="bg-foreground text-background inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
          Edit
        </Link>
        <a
          href={`/kit/${kit.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" x2="21" y1="14" y2="3" />
          </svg>
          View
        </a>
        <button
          type="button"
          onClick={downloadPdf}
          disabled={exporting}
          className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center rounded-full p-2 transition-colors disabled:opacity-50"
          aria-label="Download PDF"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-muted-foreground hover:text-red-600 hover:bg-red-50 ml-auto inline-flex items-center rounded-full p-2 transition-colors"
          aria-label="Delete kit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

function DashboardContent() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [allowedKits, setAllowedKits] = useState(1);
  const [tierId, setTierId] = useState<string | null>(null);
  const [tierName, setTierName] = useState<string | null>(null);
  const [kits, setKits] = useState<KitRecord[]>([]);
  const [profile, setProfile] = useState<ProfileFormProfile | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const router = useRouter();
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState<Record<string, PlatformStatsWithCharts> | null>(null);
  const [enabledPlatformIds] = useState<PlatformId[]>(() => getEnabledPlatformIds());
  const [showAddKit, setShowAddKit] = useState(false);
  const [newKitName, setNewKitName] = useState("");
  const [newKitSlug, setNewKitSlug] = useState("");
  const [addKitError, setAddKitError] = useState("");
  const [kitToDelete, setKitToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [inquiriesLoaded, setInquiriesLoaded] = useState(false);
  const [kitViews, setKitViews] = useState<KitViewRecord[]>([]);
  const [kitViewsThisWeek, setKitViewsThisWeek] = useState(0);
  const [kitViewsLoaded, setKitViewsLoaded] = useState(false);
  const [disconnectingInstagram, setDisconnectingInstagram] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "activity">("inbox");
  const [urlCopied, setUrlCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const sessionId = searchParams.get("session_id") ?? null;
  const instagramConnectedParam = searchParams.get("instagram_connected");
  const instagramErrorParam = searchParams.get("instagram_error");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const body = sessionId ? { session_id: sessionId } : {};
      const res = await fetch("/api/subscription-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (cancelled) return;
      const data = await res.json().catch(() => ({}));
      setIsSubscribed(data.hasSubscription === true);
      setAllowedKits(typeof data.allowedKits === "number" ? data.allowedKits : 1);
      setTierId(data.tierId ?? null);
      setTierName(data.tierName ?? null);
      setSubscriptionLoaded(true);
    }
    check();
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/kits", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (cancelled || data === null) return;
        setKits(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isSubscribed]);

  useEffect(() => {
    if (!isSubscribed) return;
    let cancelled = false;
    fetch("/api/kit-views", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setKitViews(Array.isArray(data.views) ? data.views : []);
        setKitViewsThisWeek(typeof data.thisWeek === "number" ? data.thisWeek : 0);
        setKitViewsLoaded(true);
      })
      .catch(() => { if (!cancelled) setKitViewsLoaded(true); });
    return () => { cancelled = true; };
  }, [isSubscribed]);

  useEffect(() => {
    if (tierId !== "pro") return;
    let cancelled = false;
    fetch("/api/inquiries", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) { setInquiries(Array.isArray(data) ? data : []); setInquiriesLoaded(true); }
      })
      .catch(() => { if (!cancelled) setInquiriesLoaded(true); });
    return () => { cancelled = true; };
  }, [tierId]);

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
    }
  }, [profileLoaded, profile, router]);

  useEffect(() => {
    if (!subscriptionLoaded || !profileLoaded) return;
    if (profile !== null && (profile.onboardingCompletedAt == null || profile.onboardingCompletedAt === "")) return;
    setLoading(false);
  }, [subscriptionLoaded, profileLoaded, profile]);

  useEffect(() => {
    if (!isSubscribed) return;
    let cancelled = false;
    fetch("/api/instagram/stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((stats) => {
        if (!cancelled && stats) setPlatformStats({ instagram: stats });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isSubscribed]);

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

  const handleDisconnectInstagram = async () => {
    setDisconnectingInstagram(true);
    try {
      const res = await fetch("/api/instagram/disconnect", { method: "POST", credentials: "include" });
      if (res.ok) setInstagramConnected(false);
    } finally {
      setDisconnectingInstagram(false);
    }
  };

  const instagramErrorMessages: Record<string, string> = {
    not_configured: "Instagram connect is not configured. Add META_APP_ID and META_APP_SECRET.",
    invalid: "Invalid or expired request. Try connecting again.",
    no_pages: "No Facebook Page found. Create a Page and try again.",
    permission_denied: "Meta declined access. Grant all requested permissions when prompted.",
    no_instagram_account: "No Instagram Business or Creator account linked to your Page.",
    server: "Something went wrong. Try again later.",
    access_denied: "You declined access. Connect again to grant permissions.",
  };

  const createKit = async () => {
    if (!newKitSlug.trim()) return;
    setAddKitError("");
    const res = await fetch("/api/kits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: newKitSlug.trim(), name: newKitName.trim() }),
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.id) {
      setShowAddKit(false);
      setNewKitName("");
      setNewKitSlug("");
      fetch("/api/kits", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => setKits(Array.isArray(list) ? list : []));
      window.location.href = `/kit/edit?id=${encodeURIComponent(data.id)}`;
    } else {
      setAddKitError(data.error ?? "Failed to create kit");
    }
  };

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

  // Derived helpers
  const firstName = profile?.name?.split(" ")[0] ?? "there";
  const avatarUrl = profile?.avatarUrl ?? null;
  const avatarInitials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const primaryKit = kits[0] ?? null;
  const primaryKitUrl = primaryKit ? `mediakitpro.co/kit/${primaryKit.slug}` : null;

  const handleCopyUrl = () => {
    if (!primaryKit) return;
    navigator.clipboard.writeText(`https://mediakitpro.co/kit/${primaryKit.slug}`).catch(() => {});
    setUrlCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setUrlCopied(false), 2000);
  };

  // Aggregate stats
  const instagramStats = platformStats?.["instagram"] ?? null;
  const totalViews = kits.reduce((sum, k) => sum + (k.viewCount ?? 0), 0);

  return (
    <div className="min-h-screen bg-muted/20">
      {/* ── Delete confirmation modal ── */}
      {kitToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => !deleteLoading && (setKitToDelete(null), setDeleteError(null))}
        >
          <div
            className="bg-background border-border w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-foreground text-lg font-semibold">Delete kit?</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              &ldquo;{kitToDelete.name}&rdquo; will be permanently removed. This cannot be undone.
            </p>
            {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <SecondaryBtn
                disabled={deleteLoading}
                onClick={() => { setKitToDelete(null); setDeleteError(null); }}
              >
                Cancel
              </SecondaryBtn>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={deleteKit}
                className="inline-flex h-10 items-center rounded-full bg-red-600 px-5 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AppNav
        links={[
          { href: "/pricing", label: "Pricing" },
          { href: kits[0] ? `/kit/${kits[0].slug}` : "/kit/demo", label: "View Kit", external: true },
        ]}
        onLogout={async () => {
          await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
          signOut({ callbackUrl: "/" });
        }}
      />

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-24 sm:px-8 lg:px-10">
        {/* ── Status banners ── */}
        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Payment successful! Your media kit is now live.
          </div>
        )}
        {instagramConnectedParam === "1" && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Instagram connected. Your stats and posts will now load from your account.
          </div>
        )}
        {instagramErrorParam && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p>{instagramErrorMessages[instagramErrorParam] ?? `Instagram: ${instagramErrorParam}`}</p>
            <Link href="/help/instagram" className="mt-2 inline-block text-sm font-medium underline underline-offset-4 hover:no-underline">
              See connection help →
            </Link>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <DashboardSkeleton />
        ) : !isSubscribed ? (
          /* ── Upgrade gate ── */
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="flex flex-col justify-between">
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.16em] uppercase">
                  Get started
                </p>
                <h2 className="font-display text-foreground text-2xl font-semibold tracking-tight">
                  Unlock your media kit
                </h2>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  Subscribe to publish your professional pitch page with live Instagram stats, audience demographics, and growth charts brands actually want to see.
                </p>
              </div>
              <div className="mt-8">
                <SubscribeButton email={profile?.email} />
              </div>
            </Card>

            <div className="space-y-3">
              {[
                { icon: "📊", label: "Live Instagram stats", desc: "Follower count, engagement rate, and demographics — always up to date." },
                { icon: "🎨", label: "Brand Kit Vibes (Pro)", desc: "5 signature design styles. Custom colors, fonts, and logo upload." },
                { icon: "🔗", label: "Shareable link", desc: "Your kit lives at mediakitpro.co/kit/[you]. One link for every brand pitch." },
              ].map((item) => (
                <div key={item.label} className="border-border bg-background flex gap-4 rounded-2xl border p-5">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="text-foreground text-sm font-semibold">{item.label}</p>
                    <p className="text-muted-foreground mt-0.5 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Subscribed dashboard ── */
          <div className="space-y-6">
            {/* ── Welcome banner ── */}
            <div className="bg-[#111110] dark:bg-[#1c1c1a] dark:border dark:border-[#2a2a28] rounded-2xl px-6 py-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={profile?.name ?? "Avatar"}
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="font-display text-sm font-semibold text-white/80">{avatarInitials}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-white/50 text-[11px] font-semibold tracking-[0.16em] uppercase mb-0.5">Welcome back</p>
                    <p className="font-display text-xl font-semibold text-white leading-none">{firstName}</p>
                  </div>
                </div>

                {/* Kit URL pill — only if kits exist */}
                {primaryKitUrl && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-white/8 rounded-full px-4 py-2">
                      <span className="text-white/40 text-xs font-mono hidden sm:inline">{primaryKitUrl}</span>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="text-white/60 hover:text-white transition-colors"
                        aria-label="Copy kit URL"
                      >
                        {urlCopied ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <a
                      href={`/kit/${primaryKit!.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/70 hover:text-white text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      View →
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* ── Metrics bar ── */}
            <div className="bg-background border-border rounded-2xl border">
              <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
                {/* Followers */}
                <div className="px-6 py-5">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase mb-2">Followers</p>
                  {!platformStats ? (
                    <div className="h-8 w-20 bg-muted animate-pulse rounded-full" />
                  ) : instagramStats ? (
                    <p className="font-display text-foreground text-2xl font-semibold tabular-nums">
                      <CountUp value={instagramStats.followers} duration={1400} />
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">—</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-0.5">Instagram</p>
                </div>

                {/* Engagement */}
                <div className="px-6 py-5">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase mb-2">Engagement</p>
                  {!platformStats ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded-full" />
                  ) : instagramStats ? (
                    <p className="font-display text-foreground text-2xl font-semibold tabular-nums">
                      <CountUp value={instagramStats.avgEngagement} decimals={1} suffix="%" duration={1000} />
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">—</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-0.5">avg rate</p>
                </div>

                {/* Views this week */}
                <div className="px-6 py-5">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase mb-2">Views this week</p>
                  {!kitViewsLoaded ? (
                    <div className="h-8 w-12 bg-muted animate-pulse rounded-full" />
                  ) : (
                    <p className="font-display text-foreground text-2xl font-semibold tabular-nums">
                      <CountUp value={kitViewsThisWeek} duration={1000} />
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs mt-0.5">kit page visits</p>
                </div>

                {/* All time views */}
                <div className="px-6 py-5">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase mb-2">All time views</p>
                  {!kitViewsLoaded ? (
                    <div className="h-8 w-14 bg-muted animate-pulse rounded-full" />
                  ) : (
                    <p className="font-display text-foreground text-2xl font-semibold tabular-nums">
                      <CountUp value={totalViews} duration={1200} />
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs mt-0.5">across all kits</p>
                </div>
              </div>
            </div>

            {/* ── Main grid ── */}
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              {/* ── Left sidebar — single card ── */}
              <aside>
                <div className="bg-background border-border rounded-2xl border p-6">
                  {/* Profile section */}
                  {profile && (
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mb-3">Profile</p>
                      {profileSaveError && (
                        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                          <span>{profileSaveError}</span>
                          <button
                            type="button"
                            onClick={() => setProfileSaveError(null)}
                            className="ml-3 text-xs text-red-600 hover:underline"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                      <ProfileForm
                        profile={profile}
                        onAvatarUrlChange={(url) =>
                          setProfile((p) => (p ? { ...p, avatarUrl: url } : null))
                        }
                        onSave={async (data) => {
                          setProfileSaving(true);
                          setProfileSaveError(null);
                          try {
                            const res = await fetch("/api/me/profile", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(data),
                              credentials: "include",
                            });
                            if (res.ok) {
                              const updated = await res.json();
                              setProfile((p) => (p ? { ...p, ...updated } : null));
                            } else {
                              const err = await res.json().catch(() => ({}));
                              setProfileSaveError(err.error ?? "Failed to save profile");
                            }
                          } finally {
                            setProfileSaving(false);
                          }
                        }}
                        saving={profileSaving}
                      />
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-border my-5" />

                  {/* Instagram section */}
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mb-3">Instagram</p>
                    {instagramConnected ? (
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                          <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
                          Instagram connected
                        </span>
                        <button
                          type="button"
                          onClick={handleDisconnectInstagram}
                          disabled={disconnectingInstagram}
                          className="text-muted-foreground hover:text-foreground text-xs transition-colors disabled:opacity-50"
                        >
                          {disconnectingInstagram ? "Disconnecting…" : "Disconnect"}
                        </button>
                      </div>
                    ) : (
                      <a
                        href="/api/instagram/connect"
                        className="bg-foreground text-background inline-flex h-10 w-full items-center justify-center rounded-full text-sm font-medium transition-opacity hover:opacity-80"
                      >
                        Connect Instagram →
                      </a>
                    )}
                    <Link
                      href="/help/instagram"
                      className="text-muted-foreground hover:text-foreground mt-2.5 inline-block text-xs transition-colors"
                    >
                      Connection help →
                    </Link>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border my-5" />

                  {/* Plan section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">Plan</p>
                      {tierName && (
                        <span className="bg-foreground text-background rounded-full px-2.5 py-0.5 text-[11px] font-semibold">
                          {tierName}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs mb-3">
                      {kits.length} / {allowedKits} kit{allowedKits !== 1 ? "s" : ""} used
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tierId === "starter" && (
                        <button
                          type="button"
                          onClick={upgradeToPro}
                          disabled={upgradeToProLoading}
                          className="bg-foreground text-background inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                        >
                          {upgradeToProLoading ? "Upgrading…" : "Upgrade to Pro"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={openPortal}
                        disabled={portalLoading}
                        className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {portalLoading ? "Opening…" : "Manage billing"}
                      </button>
                    </div>
                  </div>
                </div>
              </aside>

              {/* ── Main content ── */}
              <div className="space-y-6">
                {/* Kits */}
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">Your kits</p>
                    {kits.length > 0 && kits.length < allowedKits && !showAddKit && (
                      <button
                        type="button"
                        onClick={() => setShowAddKit(true)}
                        className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors"
                      >
                        + New kit
                      </button>
                    )}
                  </div>

                  {/* Empty state */}
                  {kits.length === 0 && allowedKits > 0 && (
                    <div className="border-border rounded-2xl border border-dashed p-8">
                      <p className="text-foreground text-base font-semibold">Create your first kit</p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Give it a name and a URL slug. Add work samples, rates, and brands in the editor.
                      </p>
                      <div className="mt-6 space-y-3">
                        <TextInput value={newKitName} onChange={setNewKitName} placeholder="Kit name (e.g. Fashion & Lifestyle)" />
                        <TextInput value={newKitSlug} onChange={setNewKitSlug} placeholder="URL slug (e.g. my-fashion-kit)" />
                        {addKitError && <p className="text-sm text-red-600">{addKitError}</p>}
                        <PrimaryBtn onClick={createKit}>Create &amp; edit →</PrimaryBtn>
                      </div>
                    </div>
                  )}

                  {/* Kit cards — shimmer until kits loaded */}
                  {!subscriptionLoaded ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <KitCardSkeleton />
                      <KitCardSkeleton />
                    </div>
                  ) : kits.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {kits.map((kit) => (
                        <KitCard
                          key={kit.id}
                          kit={kit}
                          onDelete={() => { setDeleteError(null); setKitToDelete({ id: kit.id, name: kit.name }); }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Add kit form */}
                  {showAddKit && kits.length > 0 && (
                    <div className="border-border mt-4 space-y-3 rounded-2xl border p-5">
                      <p className="text-foreground text-sm font-semibold">New kit</p>
                      <TextInput value={newKitName} onChange={setNewKitName} placeholder="Kit name" />
                      <TextInput value={newKitSlug} onChange={setNewKitSlug} placeholder="URL slug (e.g. my-fashion-kit)" />
                      {addKitError && <p className="text-sm text-red-600">{addKitError}</p>}
                      <div className="flex gap-2">
                        <PrimaryBtn onClick={createKit}>Create &amp; edit →</PrimaryBtn>
                        <SecondaryBtn onClick={() => { setShowAddKit(false); setNewKitName(""); setNewKitSlug(""); }}>
                          Cancel
                        </SecondaryBtn>
                      </div>
                    </div>
                  )}

                  {/* At limit message */}
                  {kits.length >= allowedKits && kits.length > 0 && !showAddKit && (
                    <p className="text-muted-foreground mt-4 text-sm">
                      At kit limit ({allowedKits}).{" "}
                      <Link href="/pricing" className="text-foreground underline underline-offset-4 hover:no-underline">
                        Upgrade for more
                      </Link>
                      .
                    </p>
                  )}

                  {/* Pro upgrade prompt for Starter users */}
                  {tierId === "starter" && (
                    <div className="border-border bg-background mt-4 flex items-center justify-between gap-4 rounded-2xl border p-5">
                      <div>
                        <p className="text-foreground text-sm font-semibold">Unlock Brand Kit Vibes</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Pro gives you 5 signature styles, custom colors, fonts, and logo upload.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={upgradeToPro}
                        disabled={upgradeToProLoading}
                        className="bg-foreground text-background shrink-0 inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                      >
                        {upgradeToProLoading ? "…" : "Upgrade"}
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Tabbed inbox + activity ── */}
                {(tierId === "pro" || (kitViewsLoaded && kits.length > 0)) && (
                  <div>
                    {/* Tab switcher */}
                    <div className="mb-4 flex items-center gap-1">
                      {tierId === "pro" && (
                        <button
                          type="button"
                          onClick={() => setActiveTab("inbox")}
                          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                            activeTab === "inbox"
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Inbox
                          {inquiries.filter((i) => !i.read).length > 0 && (
                            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                              activeTab === "inbox" ? "bg-white/20 text-white" : "bg-foreground text-background"
                            }`}>
                              {inquiries.filter((i) => !i.read).length}
                            </span>
                          )}
                        </button>
                      )}
                      {kitViewsLoaded && kits.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveTab("activity")}
                          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                            activeTab === "activity"
                              ? "bg-foreground text-background"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Activity
                        </button>
                      )}
                    </div>

                    {/* Inbox panel */}
                    {activeTab === "inbox" && tierId === "pro" && (
                      <div>
                        {!inquiriesLoaded ? (
                          <p className="text-muted-foreground text-sm">Loading…</p>
                        ) : inquiries.length === 0 ? (
                          <div className="border-border rounded-2xl border border-dashed p-8 text-center">
                            <p className="text-foreground text-sm font-semibold">No inquiries yet</p>
                            <p className="text-muted-foreground mt-1 text-sm">
                              When brands fill out your inquiry form, messages will appear here.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {inquiries.map((inq) => (
                              <div
                                key={inq.id}
                                className={`border-border rounded-2xl border p-5 transition-colors ${
                                  !inq.read ? "bg-muted/60" : "bg-background"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-foreground text-sm font-semibold truncate">{inq.name}</p>
                                      {!inq.read && (
                                        <span className="bg-foreground text-background shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                          New
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-muted-foreground text-xs mt-0.5">
                                      {inq.email}{inq.company ? ` · ${inq.company}` : ""}
                                    </p>
                                    <p className="text-muted-foreground text-[10px] mt-0.5">
                                      {inq.kit.name} · {new Date(inq.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  {!inq.read && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        fetch(`/api/inquiries/${inq.id}`, { method: "PATCH", credentials: "include" })
                                          .then((r) => r.ok ? setInquiries((prev) => prev.map((i) => i.id === inq.id ? { ...i, read: true } : i)) : null)
                                          .catch(() => {});
                                      }}
                                      className="border-border text-muted-foreground hover:text-foreground shrink-0 rounded-full border px-3 py-1 text-xs transition-colors"
                                    >
                                      Mark read
                                    </button>
                                  )}
                                </div>
                                <p className="text-foreground mt-3 text-sm leading-relaxed">{inq.message}</p>
                                <a
                                  href={`mailto:${inq.email}?subject=Re: collaboration inquiry`}
                                  className="text-muted-foreground hover:text-foreground mt-3 inline-block text-xs underline underline-offset-4 transition-colors"
                                >
                                  Reply via email →
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Activity panel */}
                    {activeTab === "activity" && kitViewsLoaded && kits.length > 0 && (
                      <div>
                        {kitViews.length === 0 ? (
                          <div className="border-border rounded-2xl border border-dashed p-8 text-center">
                            <p className="text-foreground text-sm font-semibold">No views yet</p>
                            <p className="text-muted-foreground mt-1 text-sm">
                              Share your kit link and views will appear here in real time.
                            </p>
                          </div>
                        ) : (
                          <div className="border-border rounded-2xl border divide-y divide-border overflow-hidden">
                            {kitViews.slice(0, 20).map((view) => {
                              const ago = timeAgo(view.viewedAt);
                              const domain = referrerDomain(view.referrer);
                              return (
                                <div key={view.id} className="flex items-center justify-between gap-4 px-5 py-3.5 bg-background hover:bg-muted/40 transition-colors">
                                  <div className="min-w-0">
                                    <p className="text-foreground text-sm font-medium truncate">{view.kit.name}</p>
                                    {domain && (
                                      <p className="text-muted-foreground text-xs mt-0.5 truncate">via {domain}</p>
                                    )}
                                  </div>
                                  <p className="text-muted-foreground text-xs shrink-0">{ago}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <span className="text-muted-foreground text-sm">Loading…</span>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
