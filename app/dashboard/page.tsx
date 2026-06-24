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

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-background border-border rounded-2xl border p-6 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-foreground text-lg font-semibold tracking-tight">
      {children}
    </h3>
  );
}

function CardDesc({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{children}</p>
  );
}

function PrimaryBtn({ children, onClick, disabled, type = "button", className = "" }: {
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
      className={`bg-foreground text-background inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({ children, onClick, disabled, className = "" }: {
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
      className={`border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-flex h-10 items-center rounded-full border px-5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

function TextInput({ value, onChange, placeholder, type = "text" }: {
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
    return () => { cancelled = true; };
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
      .catch((e) => { console.error("GET /api/kits error:", e); });
    return () => { cancelled = true; };
  }, [isSubscribed]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
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
        .then((r) => r.ok ? r.json() : [])
        .then((list) => setKits(Array.isArray(list) ? list : []));
      window.location.href = `/kit/edit?id=${encodeURIComponent(data.id)}`;
    } else {
      setAddKitError(data.error ?? "Failed to create kit");
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Delete kit modal */}
      {kitToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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

      <main className="mx-auto max-w-4xl px-5 pb-24 pt-24 sm:px-8">
        {/* Banners */}
        {success && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
            Payment successful! Your media kit is now live.
          </div>
        )}
        {instagramConnectedParam === "1" && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-800">
            Instagram connected. Your stats and posts will now load from your account.
          </div>
        )}
        {instagramErrorParam && (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
            <p>{instagramErrorMessages[instagramErrorParam] ?? `Instagram: ${instagramErrorParam}`}</p>
            <Link href="/help/instagram" className="mt-2 inline-block text-sm font-medium underline underline-offset-4 hover:no-underline">
              See connection help →
            </Link>
          </div>
        )}

        <div className="mb-8">
          <h1 className="font-display text-foreground text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Manage your media kit and subscription.</p>
        </div>

        {loading ? (
          <DashboardSkeleton />
        ) : !isSubscribed ? (
          <Card>
            <CardTitle>Unlock your media kit</CardTitle>
            <CardDesc>
              Subscribe to publish your professional pitch deck and connect live social stats.
            </CardDesc>
            <div className="mt-6 max-w-sm">
              <SubscribeButton email={profile?.email} />
            </div>
          </Card>
        ) : (
          <div className="space-y-5">
            {/* Profile */}
            {profile && (
              <Card>
                <CardTitle>Profile</CardTitle>
                <CardDesc>
                  Shown on your public media kit. Set a username for a clean link.
                </CardDesc>
                {profileSaveError && (
                  <div className="mb-4 mt-3 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex items-center justify-between">
                    <span>{profileSaveError}</span>
                    <button
                      type="button"
                      onClick={() => setProfileSaveError(null)}
                      className="ml-3 text-red-600 hover:underline text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                <div className="mt-5">
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
              </Card>
            )}

            {/* Instagram */}
            <Card>
              <CardTitle>Instagram</CardTitle>
              <CardDesc>
                Connect your Instagram Business or Creator account to show live follower stats and pick posts for your kit.
              </CardDesc>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {instagramConnected ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                      <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
                      Connected
                    </span>
                    <SecondaryBtn onClick={handleDisconnectInstagram} disabled={disconnectingInstagram}>
                      {disconnectingInstagram ? "Disconnecting…" : "Disconnect"}
                    </SecondaryBtn>
                  </>
                ) : (
                  <a
                    href="/api/instagram/connect"
                    className="bg-foreground text-background inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition-opacity hover:opacity-80"
                  >
                    Connect Instagram
                  </a>
                )}
                <Link
                  href="/help/instagram"
                  className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Connection help →
                </Link>
              </div>
            </Card>

            {/* Platform stats */}
            {enabledPlatformIds.length > 0 && platformStats && (
              <div className="grid gap-4 md:grid-cols-2">
                {enabledPlatformIds.map((platformId) => {
                  const meta = getPlatformMeta(platformId);
                  const stats = platformStats[platformId];
                  if (!stats) return null;
                  return (
                    <Card key={platformId}>
                      <p className="text-muted-foreground text-xs font-semibold tracking-[0.15em] uppercase">
                        {meta.displayName}
                      </p>
                      <p className="font-display text-foreground mt-2 text-2xl font-semibold">
                        {stats.followers.toLocaleString()} followers
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        +{stats.growthThisMonth}% this month · {stats.avgEngagement}% engagement
                      </p>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Kits */}
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Your kits</CardTitle>
                  <CardDesc>
                    Up to {allowedKits} kit{allowedKits !== 1 ? "s" : ""}. Each has its own shareable link.
                  </CardDesc>
                </div>
                {kits.length > 0 && kits.length < allowedKits && !showAddKit && (
                  <button
                    type="button"
                    onClick={() => setShowAddKit(true)}
                    className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 shrink-0 inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors"
                  >
                    + Add kit
                  </button>
                )}
              </div>

              {/* No kits yet */}
              {kits.length === 0 && allowedKits > 0 && (
                <div className="border-border mt-5 rounded-2xl border border-dashed p-6">
                  <h4 className="font-display text-foreground text-base font-semibold">Create your first kit</h4>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Add a name and URL slug to get started. You can add work samples, rates and brands in the editor.
                  </p>
                  <div className="mt-5 space-y-3">
                    <TextInput
                      value={newKitName}
                      onChange={setNewKitName}
                      placeholder="Kit name"
                    />
                    <TextInput
                      value={newKitSlug}
                      onChange={setNewKitSlug}
                      placeholder="URL slug (e.g. my-fashion-kit)"
                    />
                    {addKitError && <p className="text-sm text-red-600">{addKitError}</p>}
                    <PrimaryBtn onClick={createKit}>Create & edit</PrimaryBtn>
                  </div>
                </div>
              )}

              {/* Kit list */}
              {kits.length > 0 && (
                <ul className="mt-5 space-y-2">
                  {kits.map((kit) => (
                    <li
                      key={kit.id}
                      className="border-border flex flex-wrap items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground text-sm font-medium truncate">{kit.name}</p>
                        <p className="text-muted-foreground text-xs">/kit/{kit.slug}</p>
                      </div>
                      {typeof kit.viewCount === "number" && (
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {kit.viewCount === 0 ? "No views yet" : `${kit.viewCount} view${kit.viewCount !== 1 ? "s" : ""}`}
                        </span>
                      )}
                      <div className="flex shrink-0 gap-1">
                        <Link
                          href={`/kit/edit?id=${encodeURIComponent(kit.id)}`}
                          title="Edit"
                          aria-label="Edit kit"
                          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-2 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </Link>
                        <a
                          href={`/kit/${kit.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View"
                          aria-label="View kit"
                          className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-2 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
                        </a>
                        <button
                          type="button"
                          title="Delete"
                          aria-label="Delete kit"
                          onClick={() => { setDeleteError(null); setKitToDelete({ id: kit.id, name: kit.name }); }}
                          className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add kit form (secondary) */}
              {showAddKit && kits.length > 0 && (
                <div className="border-border mt-4 space-y-3 rounded-2xl border p-5">
                  <TextInput value={newKitName} onChange={setNewKitName} placeholder="Kit name" />
                  <TextInput value={newKitSlug} onChange={setNewKitSlug} placeholder="URL slug (e.g. my-fashion-kit)" />
                  {addKitError && <p className="text-sm text-red-600">{addKitError}</p>}
                  <div className="flex gap-2">
                    <PrimaryBtn onClick={createKit}>Create & edit</PrimaryBtn>
                    <SecondaryBtn onClick={() => { setShowAddKit(false); setNewKitName(""); setNewKitSlug(""); }}>
                      Cancel
                    </SecondaryBtn>
                  </div>
                </div>
              )}

              {allowedKits === 0 && (
                <p className="text-muted-foreground mt-4 text-sm">Subscribe to create your first kit.</p>
              )}
              {kits.length >= allowedKits && kits.length > 0 && !showAddKit && (
                <p className="text-muted-foreground mt-4 text-sm">
                  At kit limit ({allowedKits}).{" "}
                  <Link href="/pricing" className="text-foreground underline underline-offset-4 hover:no-underline">
                    Upgrade for more
                  </Link>
                  .
                </p>
              )}
            </Card>

            {/* Subscription */}
            <Card>
              <CardTitle>Subscription</CardTitle>
              {tierName && (
                <p className="text-muted-foreground mt-2 text-sm">
                  Current plan:{" "}
                  <span className="text-foreground font-medium">{tierName}</span>
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-3">
                {tierId === "starter" && (
                  <PrimaryBtn
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
                  >
                    {upgradeLoading ? "Upgrading…" : "Upgrade to Pro"}
                  </PrimaryBtn>
                )}
                <SecondaryBtn
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
                      if (data.url) { window.location.href = data.url; return; }
                      alert(data.error || "Could not open billing portal.");
                    } catch {
                      alert("Something went wrong.");
                    } finally {
                      setPortalLoading(false);
                    }
                  }}
                  disabled={portalLoading}
                >
                  {portalLoading ? "Opening…" : "Manage subscription"}
                </SecondaryBtn>
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                Update payment method, view invoices, or cancel from the Stripe portal.
              </p>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><span className="text-muted-foreground text-sm">Loading…</span></div>}>
      <DashboardContent />
    </Suspense>
  );
}
