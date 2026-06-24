"use client";

import { useState, useEffect, Suspense } from "react";
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
import { DashboardSkeleton } from "../components/Skeleton";
import type { KitRecord } from "@/lib/kit-storage";
import type { ProfilePayload } from "@/app/api/me/profile/route";

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
  const [disconnectingInstagram, setDisconnectingInstagram] = useState(false);
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
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/kits", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          console.error("GET /api/kits failed:", r.status, err);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (cancelled || data === null) return;
        setKits(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error("GET /api/kits error:", e);
      });
    return () => { cancelled = true; };
  }, [isSubscribed]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setProfileLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null);
          setProfileLoaded(true);
        }
      });
    return () => { cancelled = true; };
  }, []);

  // Redirect to onboarding if user has not completed it (before showing dashboard)
  useEffect(() => {
    if (!profileLoaded || profile === null) return;
    if (profile.onboardingCompletedAt == null || profile.onboardingCompletedAt === "") {
      router.replace("/onboarding");
    }
  }, [profileLoaded, profile, router]);

  // Once subscription is loaded and we're not redirecting, allow dashboard to show
  useEffect(() => {
    if (!subscriptionLoaded || !profileLoaded) return;
    if (profile !== null && (profile.onboardingCompletedAt == null || profile.onboardingCompletedAt === "")) return;
    setLoading(false);
  }, [subscriptionLoaded, profileLoaded, profile]);

  // Load platform stats from API (Instagram; uses token or mock) when subscribed
  useEffect(() => {
    if (!isSubscribed) return;
    let cancelled = false;
    fetch("/api/instagram/stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((stats) => {
        if (!cancelled && stats) setPlatformStats({ instagram: stats });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isSubscribed]);

  // Instagram connection status
  useEffect(() => {
    let cancelled = false;
    fetch("/api/instagram/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setInstagramConnected(data.connected === true); })
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
    no_pages: "No Facebook Page found. Create a Page and try again, or grant the app access to your Pages.",
    permission_denied: "Meta declined access. Grant all requested permissions (Pages, Instagram) when prompted.",
    no_instagram_account: "No Instagram Business or Creator account linked to your Page.",
    server: "Something went wrong. Try again later.",
    access_denied: "You declined access. Connect again to grant permissions.",
  };

  return (
    <div className="min-h-screen">
      {/* Delete kit confirmation modal */}
      {kitToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !deleteLoading && (setKitToDelete(null), setDeleteError(null))}
        >
          <div
            className="bg-white border border-[#E8E6E3] rounded-lg shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-semibold text-[#1A1A1A]">
              Delete kit?
            </h3>
            <p className="mt-2 text-sm text-[#5C5C5C]">
              &ldquo;{kitToDelete.name}&rdquo; will be permanently removed. This cannot be undone.
            </p>
            {deleteError && (
              <p className="mt-3 text-sm text-red-600">{deleteError}</p>
            )}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => {
                  setKitToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-[#5C5C5C] hover:text-[#1A1A1A] disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={async () => {
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
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-sm disabled:opacity-70"
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

      <main className="pt-[calc(7rem+env(safe-area-inset-top))] px-6 pb-24 max-w-4xl mx-auto">
        {success && (
          <div className="mb-8 p-4 rounded-sm bg-green-50 border border-green-200 text-green-800 text-sm">
            Payment successful! Your media kit is now live.
          </div>
        )}
        {instagramConnectedParam === "1" && (
          <div className="mb-8 p-4 rounded-sm bg-green-50 border border-green-200 text-green-800 text-sm">
            Instagram connected. Your stats and posts will now load from your account.
          </div>
        )}
        {instagramErrorParam && (
          <div className="mb-8 p-4 rounded-sm bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <p>{instagramErrorMessages[instagramErrorParam] ?? `Instagram: ${instagramErrorParam}`}</p>
            <Link href="/help/instagram" className="mt-2 inline-block text-sm font-medium underline hover:no-underline">
              See connection help →
            </Link>
          </div>
        )}

        <h1 className="font-display text-3xl font-semibold text-[#1A1A1A]">
          Dashboard
        </h1>
        <p className="mt-2 text-[#5C5C5C]">
          Manage your media kit and subscription.
        </p>

        {loading ? (
          <DashboardSkeleton />
        ) : !isSubscribed ? (
          <div className="mt-12 p-8 border border-[#E8E6E3] rounded-sm bg-white">
            <h2 className="font-display text-xl font-semibold text-[#1A1A1A]">
              Unlock your media kit
            </h2>
            <p className="mt-2 text-[#5C5C5C] text-sm">
              Subscribe to publish your professional pitch deck and connect live
              social stats.
            </p>
            <div className="mt-6 max-w-sm">
              <SubscribeButton email={profile?.email} />
            </div>
          </div>
        ) : (
          <div className="mt-12 space-y-8">
            {/* Profile */}
            {profile && (
              <div className="p-6 border border-[#E8E6E3] rounded-sm bg-white">
                <h3 className="font-display text-lg font-semibold text-[#1A1A1A]">
                  Profile
                </h3>
                <p className="mt-1 text-sm text-[#5C5C5C]">
                  Shown on your public media kit. Set a username for a clean link.
                </p>
                {profileSaveError && (
                  <div className="mb-4 rounded-sm bg-red-50 border border-red-200 p-3 text-sm text-red-800">
                    {profileSaveError}
                    <button
                      type="button"
                      onClick={() => setProfileSaveError(null)}
                      className="ml-2 text-red-600 hover:underline"
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

            {/* Instagram connection */}
            <div className="p-6 border border-[#E8E6E3] rounded-sm bg-white">
              <h3 className="font-display text-lg font-semibold text-[#1A1A1A]">
                Instagram
              </h3>
              <p className="mt-1 text-sm text-[#5C5C5C]">
                Connect your Instagram Business or Creator account to show live follower stats and pick posts for your kit.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {instagramConnected ? (
                  <>
                    <p className="text-sm text-green-600 font-medium">Connected</p>
                    <button
                      type="button"
                      onClick={handleDisconnectInstagram}
                      disabled={disconnectingInstagram}
                      className="inline-block px-4 py-2 border border-[#E8E6E3] text-[#5C5C5C] text-sm font-medium rounded-sm hover:bg-[#FAFAFA] hover:border-[#8C8C8C] disabled:opacity-50"
                    >
                      {disconnectingInstagram ? "Disconnecting…" : "Disconnect"}
                    </button>
                  </>
                ) : (
                  <a
                    href="/api/instagram/connect"
                    className="inline-block px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-sm hover:bg-[#2D2D2D]"
                  >
                    Connect Instagram
                  </a>
                )}
                <Link
                  href="/help/instagram"
                  className="text-sm text-[#5C5C5C] hover:text-[#1A1A1A] hover:underline"
                >
                  Connection help
                </Link>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {enabledPlatformIds.map((platformId) => {
                const meta = getPlatformMeta(platformId);
                const stats = platformStats?.[platformId];
                if (!stats) return null;
                return (
                  <div
                    key={platformId}
                    className="p-6 border border-[#E8E6E3] rounded-sm bg-white"
                  >
                    <h3 className="text-sm uppercase tracking-wider text-[#8C8C8C]">
                      {meta.displayName}
                    </h3>
                    <p className="mt-2 font-display text-2xl font-semibold text-[#1A1A1A]">
                      {stats.followers.toLocaleString()} followers
                    </p>
                    <p className="mt-1 text-sm text-[#5C5C5C]">
                      +{stats.growthThisMonth}% this month • {stats.avgEngagement}% engagement
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="p-6 border border-[#E8E6E3] rounded-sm bg-white">
              <h3 className="font-display text-lg font-semibold text-[#1A1A1A]">
                Your kits
              </h3>
              <p className="mt-2 text-sm text-[#5C5C5C]">
                You can create up to {allowedKits} kit{allowedKits !== 1 ? "s" : ""}. Each has its own shareable link.
              </p>
              {kits.length === 0 && allowedKits > 0 ? (
                <div className="mt-6 p-6 rounded-lg bg-[#FAFAFA] border border-[#E8E6E3] border-dashed">
                  <h4 className="font-display text-base font-semibold text-[#1A1A1A]">
                    Create your first kit
                  </h4>
                  <p className="mt-1 text-sm text-[#5C5C5C]">
                    Add a name and URL slug to get started. You can add work samples, rates and brands in the editor.
                  </p>
                  <div className="mt-4 space-y-3">
                    <input
                      type="text"
                      placeholder="Kit name"
                      value={newKitName}
                      onChange={(e) => setNewKitName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
                    />
                    <input
                      type="text"
                      placeholder="URL slug (e.g. my-fashion-kit)"
                      value={newKitSlug}
                      onChange={(e) => setNewKitSlug(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
                    />
                    {addKitError && <p className="text-sm text-red-600">{addKitError}</p>}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
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
                              .then((r) => r.ok ? r.json() : [])
                              .then((list) => setKits(Array.isArray(list) ? list : []));
                            window.location.href = `/kit/edit?id=${encodeURIComponent(data.id)}`;
                          } else {
                            setAddKitError(data.error ?? "Failed to create kit");
                          }
                        }}
                        className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-sm hover:bg-[#2D2D2D]"
                      >
                        Create & edit
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
              <ul className="mt-4 space-y-3">
                {kits.map((kit) => (
                  <li
                    key={kit.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg border border-[#E8E6E3] bg-white"
                  >
                    <span className="font-medium text-[#1A1A1A]">{kit.name}</span>
                    <span className="text-xs text-[#8C8C8C]">/kit/{kit.slug}</span>
                    {typeof kit.viewCount === "number" && (
                      <span className="text-xs text-[#5C5C5C]">
                        {kit.viewCount === 0 ? "No views yet" : `${kit.viewCount} view${kit.viewCount !== 1 ? "s" : ""}`}
                      </span>
                    )}
                    <div className="flex gap-1 ml-auto">
                      <Link
                        href={`/kit/edit?id=${encodeURIComponent(kit.id)}`}
                        title="Edit"
                        className="p-2 rounded-sm text-[#1A1A1A] hover:bg-[#F0F0F0] transition-colors"
                        aria-label="Edit kit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </Link>
                      <a
                        href={`/kit/${kit.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View"
                        className="p-2 rounded-sm text-[#1A1A1A] hover:bg-[#F0F0F0] transition-colors"
                        aria-label="View kit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                      </a>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => {
                          setDeleteError(null);
                          setKitToDelete({ id: kit.id, name: kit.name });
                        }}
                        className="p-2 rounded-sm text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="Delete kit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              )}
              {(kits.length > 0 || allowedKits === 0) && (showAddKit && kits.length > 0 ? (
                <div className="mt-4 p-4 rounded-lg bg-[#FAFAFA] border border-[#E8E6E3] space-y-3">
                  <input
                    type="text"
                    placeholder="Kit name"
                    value={newKitName}
                    onChange={(e) => setNewKitName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
                  />
                  <input
                    type="text"
                    placeholder="URL slug (e.g. my-fashion-kit)"
                    value={newKitSlug}
                    onChange={(e) => setNewKitSlug(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
                  />
                  {addKitError && <p className="text-sm text-red-600">{addKitError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
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
                            .then((r) => r.ok ? r.json() : [])
                            .then((list) => setKits(Array.isArray(list) ? list : []));
                          window.location.href = `/kit/edit?id=${encodeURIComponent(data.id)}`;
                        } else {
                          setAddKitError(data.error ?? "Failed to create kit");
                        }
                      }}
                      className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-sm hover:bg-[#2D2D2D]"
                    >
                      Create & edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddKit(false);
                        setNewKitName("");
                        setNewKitSlug("");
                      }}
                      className="px-4 py-2 border border-[#E8E6E3] text-sm rounded-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : allowedKits === 0 ? (
                <p className="mt-4 text-sm text-[#8C8C8C]">
                  Subscribe to create your first kit.
                </p>
              ) : kits.length < allowedKits ? (
                <button
                  type="button"
                  onClick={() => setShowAddKit(true)}
                  className="mt-4 px-4 py-2 border border-dashed border-[#D4D4D4] text-sm text-[#5C5C5C] rounded-sm hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
                >
                  + Add kit
                </button>
              ) : (
                <p className="mt-4 text-sm text-[#8C8C8C]">
                  At kit limit ({allowedKits}). Upgrade your plan for more.
                </p>
              ))}
            </div>

            <div className="p-6 border border-[#E8E6E3] rounded-sm bg-white">
              <h3 className="font-display text-lg font-semibold text-[#1A1A1A]">
                Subscription
              </h3>
              {tierName && (
                <p className="mt-2 text-sm text-[#5C5C5C]">
                  Current plan: <span className="font-medium text-[#1A1A1A]">{tierName}</span>
                </p>
              )}
              {tierId === "starter" && (
                <button
                  type="button"
                  onClick={async () => {
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
                  }}
                  disabled={upgradeLoading}
                  className="mt-3 px-4 py-2 border border-[#1A1A1A] text-[#1A1A1A] text-sm font-medium rounded-sm hover:bg-[#FAFAFA] disabled:opacity-70"
                >
                  {upgradeLoading ? "Upgrading…" : "Upgrade to Pro"}
                </button>
              )}
              <p className="mt-2 text-sm text-[#5C5C5C]">
                Update payment method, view invoices, or cancel from the Stripe portal.
              </p>
              <button
                type="button"
                onClick={async () => {
                  setPortalLoading(true);
                  try {
                    const res = await fetch("/api/create-portal-session", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({}),
                      credentials: "include",
                    });
                    const data = await res.json();
                    if (data.url) {
                      window.location.href = data.url;
                      return;
                    }
                    alert(data.error || "Could not open billing portal.");
                  } catch {
                    alert("Something went wrong.");
                  } finally {
                    setPortalLoading(false);
                  }
                }}
                disabled={portalLoading}
                className="mt-4 px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-sm hover:bg-[#2D2D2D] disabled:opacity-70"
              >
                {portalLoading ? "Opening…" : "Manage subscription"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
