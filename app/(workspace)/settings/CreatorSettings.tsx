"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ProfileForm, type ProfileFormProfile } from "@/app/components/ProfileForm";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import type { ProfilePayload } from "@/app/api/me/profile/route";
import { WorkspaceShell, PageHeader, Panel } from "@/app/components/workspace/WorkspaceShell";
import { Skeleton, FieldSkeleton, PanelSkeleton } from "@/app/components/Skeleton";
import { ConnectionsPanel, PlanPanel } from "../dashboard/WorkspaceWidgets";
import { AccountPanels, AppearancePanel } from "./AccountPanels";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileFormProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Instagram
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // YouTube
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeDisconnecting, setYoutubeDisconnecting] = useState(false);

  // Plan
  const [tierName, setTierName] = useState<string | null>(null);
  const [tierId, setTierId] = useState<string | null>(null);
  const [allowedKits, setAllowedKits] = useState(1);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [planLoaded, setPlanLoaded] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  useEffect(() => {
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { setProfile(data); setLoading(false); })
      .catch(() => setLoading(false));

    fetch("/api/instagram/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setInstagramConnected(data.connected === true); })
      .catch(() => {});

    fetch("/api/youtube/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setYoutubeConnected(data.connected === true); })
      .catch(() => {});

    fetch("/api/subscription-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setTierName(data.tierName ?? null);
          setTierId(data.tierId ?? null);
          setAllowedKits(typeof data.allowedKits === "number" ? data.allowedKits : 1);
          setHasSubscription(data.hasSubscription === true);
        }
        setPlanLoaded(true);
      })
      .catch(() => setPlanLoaded(true));
  }, []);

  const handleSave = async (data: ProfilePayload) => {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (res.ok) {
        const updated = await res.json();
        // The PUT response doesn't echo niches, so merge what we sent as well.
        setProfile((p) => (p ? { ...p, ...data, ...updated } : null));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        // The sidebar persists across tabs; tell it the new display name.
        window.dispatchEvent(new CustomEvent("kitevo:profile-updated", { detail: { name: updated.name ?? data.name ?? null } }));
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveError(err.error ?? "Failed to save profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/instagram/disconnect", { method: "POST", credentials: "include" });
      if (res.ok) setInstagramConnected(false);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleYoutubeDisconnect = async () => {
    setYoutubeDisconnecting(true);
    try {
      const res = await fetch("/api/youtube/disconnect", { method: "POST", credentials: "include" });
      if (res.ok) setYoutubeConnected(false);
    } finally {
      setYoutubeDisconnecting(false);
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
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  };

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
      }
    } finally {
      setUpgradeLoading(false);
    }
  };

  const isPaidTier = !!tierId && tierId !== "free";

  return (
    <WorkspaceShell variant="creator" width="wide">
      <PageHeader eyebrow="Settings" title="Profile & settings" description="Your public profile, connected accounts and plan." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main: the public profile ── */}
        <div className="min-w-0 lg:col-span-2">
          <Panel
            title={
              <span className="inline-flex items-center gap-1.5">
                Public profile <VerifiedBadge tier={profile?.verifiedTier} size="sm" />
              </span>
            }
            action={
              profile?.username ? (
                <Link
                  href={`/${profile.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  View profile <ExternalLink size={12} aria-hidden />
                </Link>
              ) : null
            }
            bodyClassName=""
          >
            {loading ? (
              <div className="space-y-6 p-5 sm:p-6" aria-hidden>
                <div className="flex items-center gap-5">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-28 rounded-full" />
                    <Skeleton className="h-3 w-3/4 rounded-full" />
                    <Skeleton className="mt-3 h-8 w-32 rounded-full" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldSkeleton />
                  <FieldSkeleton />
                </div>
                <FieldSkeleton tall />
              </div>
            ) : profile ? (
              <ProfileForm
                profile={profile}
                externalError={saveError}
                onAvatarUrlChange={(url) => setProfile((p) => (p ? { ...p, avatarUrl: url } : null))}
                onSave={handleSave}
                saving={saving}
                saved={saved}
                submitLabel="Save profile"
              />
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                Could not load your profile.{" "}
                <Link href="/dashboard" className="underline underline-offset-4">
                  Go back
                </Link>
                .
              </p>
            )}
          </Panel>
        </div>

        {/* ── Rail: connections, plan, account ── */}
        <aside className="min-w-0 space-y-6">
          <ConnectionsPanel
            instagram={{ connected: instagramConnected, detail: instagramConnected ? "Connected · stats syncing" : undefined }}
            youtube={{ connected: youtubeConnected, detail: youtubeConnected ? "Connected · stats syncing" : undefined }}
            isPaidTier={isPaidTier}
            onDisconnectInstagram={handleDisconnect}
            onDisconnectYoutube={handleYoutubeDisconnect}
            busy={{ instagram: disconnecting, youtube: youtubeDisconnecting }}
          />

          {planLoaded ? (
            <PlanPanel
              tierId={tierId}
              tierName={tierName}
              kitsAllowed={allowedKits}
              onManageBilling={hasSubscription ? openPortal : null}
              managing={portalLoading}
              onUpgradeToPro={upgradeToPro}
              upgrading={upgradeLoading}
            />
          ) : (
            <PanelSkeleton rows={1} titleWidth="w-10" />
          )}

          <AppearancePanel />
          <AccountPanels email={profile?.email ?? null} />
        </aside>
      </div>
    </WorkspaceShell>
  );
}
