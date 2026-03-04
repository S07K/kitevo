"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { SubscribeButton } from "../components/SubscribeButton";
import {
  getEnabledPlatformIds,
  getPlatformMeta,
  type PlatformId,
  type PlatformStatsWithCharts,
} from "@/lib/platforms";
import { AppNav } from "../components/AppNav";
import type { KitRecord } from "@/lib/kit-storage";
import type { ProfilePayload, ProfileLink } from "@/app/api/me/profile/route";

function ProfileForm({
  profile,
  onSave,
  saving,
}: {
  profile: ProfilePayload & { email?: string };
  onSave: (data: ProfilePayload) => Promise<void>;
  saving: boolean;
}) {
  const [name, setName] = useState(profile.name ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [links, setLinks] = useState<ProfileLink[]>(profile.links?.length ? [...profile.links] : [{ label: "", url: "" }]);

  useEffect(() => {
    setName(profile.name ?? "");
    setUsername(profile.username ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatarUrl ?? "");
    setLinks(profile.links?.length ? [...profile.links] : [{ label: "", url: "" }]);
  }, [profile]);

  const addLink = () => setLinks((prev) => [...prev, { label: "", url: "" }]);
  const removeLink = (i: number) => setLinks((prev) => prev.filter((_, idx) => idx !== i));
  const updateLink = (i: number, field: "label" | "url", value: string) =>
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: ProfilePayload = {
      name: name.trim() || null,
      username: username.trim().toLowerCase().replace(/\s+/g, "-") || null,
      bio: bio.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
      links: links.filter((l) => l.label.trim() || l.url.trim()).map((l) => ({ label: l.label.trim(), url: l.url.trim() })),
    };
    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-[#1A1A1A]">Display name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-[#D4D4D4] rounded-sm text-[#1A1A1A]"
          placeholder="Your name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1A1A1A]">Username (for /kit/username link)</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-[#D4D4D4] rounded-sm text-[#1A1A1A]"
          placeholder="username"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1A1A1A]">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="mt-1 w-full px-3 py-2 border border-[#D4D4D4] rounded-sm text-[#1A1A1A]"
          placeholder="Short bio"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#1A1A1A]">Avatar URL</label>
        <input
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-[#D4D4D4] rounded-sm text-[#1A1A1A]"
          placeholder="https://..."
        />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-[#1A1A1A]">Links</label>
          <button type="button" onClick={addLink} className="text-sm text-[#5C5C5C] hover:underline">+ Add</button>
        </div>
        <div className="mt-2 space-y-2">
          {links.map((l, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={l.label}
                onChange={(e) => updateLink(i, "label", e.target.value)}
                placeholder="Label"
                className="flex-1 px-3 py-2 border border-[#D4D4D4] rounded-sm text-sm"
              />
              <input
                type="url"
                value={l.url}
                onChange={(e) => updateLink(i, "url", e.target.value)}
                placeholder="URL"
                className="flex-1 px-3 py-2 border border-[#D4D4D4] rounded-sm text-sm"
              />
              <button type="button" onClick={() => removeLink(i)} className="text-red-600 text-sm">×</button>
            </div>
          ))}
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-sm hover:bg-[#2D2D2D] disabled:opacity-70"
      >
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

function DashboardContent() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [allowedKits, setAllowedKits] = useState(1);
  const [tierId, setTierId] = useState<string | null>(null);
  const [tierName, setTierName] = useState<string | null>(null);
  const [kits, setKits] = useState<KitRecord[]>([]);
  const [profile, setProfile] = useState<ProfilePayload & { email?: string } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
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
      setLoading(false);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/kits", { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (!cancelled) setKits(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setKits([]); });
    return () => { cancelled = true; };
  }, [isSubscribed]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled) setProfile(data); })
      .catch(() => { if (!cancelled) setProfile(null); });
    return () => { cancelled = true; };
  }, []);

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
      />

      <main className="pt-[calc(7rem+env(safe-area-inset-top))] px-6 pb-24 max-w-4xl mx-auto">
        <div className="flex items-center justify-end gap-4 mb-4">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-[#5C5C5C] hover:text-[#1A1A1A]"
          >
            Log out
          </button>
        </div>
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
          <p className="mt-8 text-[#5C5C5C] text-sm">Checking subscription…</p>
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
                <ProfileForm
                  profile={profile}
                  onSave={async (data) => {
                    setProfileSaving(true);
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
                        alert(err.error ?? "Failed to save");
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
                  <p className="text-sm text-green-600 font-medium">Connected</p>
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
              <ul className="mt-4 space-y-3">
                {kits.map((kit) => (
                  <li
                    key={kit.id}
                    className="flex flex-wrap items-center gap-3 py-3 border-b border-[#E8E6E3] last:border-0"
                  >
                    <span className="font-medium text-[#1A1A1A]">{kit.name}</span>
                    <span className="text-xs text-[#8C8C8C]">/kit/{kit.slug}</span>
                    <div className="flex gap-2 ml-auto">
                      <Link
                        href={`/kit/edit?id=${encodeURIComponent(kit.id)}`}
                        className="text-sm font-medium text-[#1A1A1A] underline"
                      >
                        Edit
                      </Link>
                      <a
                        href={`/kit/${kit.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-[#1A1A1A] underline"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setKitToDelete({ id: kit.id, name: kit.name });
                        }}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {showAddKit ? (
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
              )}
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
