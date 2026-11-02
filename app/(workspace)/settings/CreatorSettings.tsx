"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { AccountProfile } from "@/lib/profile-types";
import { WorkspaceShell, PageHeader } from "@/app/components/workspace/WorkspaceShell";
import { PanelSkeleton } from "@/app/components/Skeleton";
import { ProfileSummaryPanel, UsernamePanel } from "./AccountSettings";
import { ConnectionsPanel, PlanPanel } from "../dashboard/WorkspaceWidgets";
import { AccountPanels } from "./AccountPanels";

/**
 * Creator settings = the account: username, connected accounts, plan, sign-out/delete.
 * Everything brands see on the kit (photo, name, bio, niches, links) is edited in the kit
 * editor; the profile card here summarises it and links there.
 */
export default function CreatorSettings() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [kitId, setKitId] = useState<string | null>(null);

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

    // The main kit (first in the list, as on the dashboard) is where the profile is edited.
    fetch("/api/kits", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((kits) => { if (Array.isArray(kits) && kits[0]?.id) setKitId(kits[0].id); })
      .catch(() => {});

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
      <PageHeader eyebrow="Settings" title="Settings" description="Your account, connected accounts and plan." />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main: profile summary (edited in the kit editor) + username ── */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {loading ? (
            <>
              <PanelSkeleton rows={3} titleWidth="w-24" />
              <PanelSkeleton rows={1} titleWidth="w-20" />
            </>
          ) : profile ? (
            <>
              <ProfileSummaryPanel profile={profile} kitId={kitId} />
              <UsernamePanel
                username={profile.username ?? ""}
                onSaved={(username) => {
                  setProfile((p) => (p ? { ...p, username } : p));
                  window.dispatchEvent(new CustomEvent("kitevo:profile-updated", { detail: { name: profile.name ?? null } }));
                }}
              />
            </>
          ) : (
            <p className="rounded-2xl border border-border bg-background p-6 text-sm text-muted-foreground">
              Couldn&apos;t load your account.{" "}
              <Link href="/dashboard" className="underline underline-offset-4">
                Back to dashboard
              </Link>
              .
            </p>
          )}
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

          <AccountPanels email={profile?.email ?? null} />
        </aside>
      </div>
    </WorkspaceShell>
  );
}
