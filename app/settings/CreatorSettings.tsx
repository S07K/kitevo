"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { ProfileForm, type ProfileFormProfile } from "../components/ProfileForm";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { signOut } from "next-auth/react";
import type { ProfilePayload } from "@/app/api/me/profile/route";
import { WorkspaceShell, PageHeader, Panel } from "@/app/components/workspace/WorkspaceShell";
import { Button } from "@/app/components/workspace/Button";
import { Skeleton, FieldSkeleton, PanelSkeleton } from "@/app/components/Skeleton";
import { ConnectionsPanel, PlanPanel } from "../dashboard/WorkspaceWidgets";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileFormProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Account deletion
  const [deleteStep, setDeleteStep] = useState<"idle" | "sent" | "confirmed">("idle");
  const [deleteCode, setDeleteCode] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSentTo, setDeleteSentTo] = useState<string | null>(null);
  const [deleteDevCode, setDeleteDevCode] = useState<string | null>(null);

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

  const requestDeleteCode = async (resend = false) => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/me/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request" }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.error ?? "Failed to send code");
        return;
      }
      if (resend) setDeleteCode("");
      else setDeleteSentTo(data.email);
      setDeleteDevCode(data.devCode ?? null);
      setDeleteStep("sent");
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/me/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", code: deleteCode }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.error ?? "Failed to confirm");
        return;
      }
      // Account deleted — sign out and redirect
      setDeleteStep("confirmed");
      await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
      signOut({ callbackUrl: "/?deleted=1" });
    } finally {
      setDeleteLoading(false);
    }
  };

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

          <Panel title="Account">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="mt-0.5 truncate text-sm font-medium text-foreground">{profile?.email ?? "—"}</p>
            <Button
              className="mt-4 w-full"
              onClick={async () => {
                await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
                signOut({ callbackUrl: "/" });
              }}
            >
              <LogOut size={14} aria-hidden /> Sign out
            </Button>
          </Panel>

          <section className="rounded-2xl border border-red-200 bg-background dark:border-red-900/60">
            <div className="border-b border-red-200 px-5 py-3.5 sm:px-6 dark:border-red-900/60">
              <h2 className="text-sm font-semibold tracking-tight text-red-600 dark:text-red-400">Danger zone</h2>
            </div>
            <div className="p-5 sm:p-6">
              {deleteStep === "idle" && (
                <>
                  <p className="text-sm font-medium text-foreground">Delete account</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Permanently deletes your account, all kits and data. This cannot be undone.
                  </p>
                  {deleteError && <p className="mt-3 text-xs text-red-600 dark:text-red-400">{deleteError}</p>}
                  <Button variant="danger-outline" className="mt-4 w-full" disabled={deleteLoading} onClick={() => requestDeleteCode()}>
                    {deleteLoading ? "Sending code…" : "Delete account"}
                  </Button>
                </>
              )}

              {deleteStep === "sent" && (
                <div className="space-y-3">
                  <p className="text-sm text-foreground">
                    We sent a 6-digit code to <strong>{deleteSentTo}</strong>. Enter it to confirm.
                  </p>
                  {deleteDevCode && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 font-mono text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                      <span className="font-sans font-semibold">Dev mode, email failed. Code: </span>
                      {deleteDevCode}
                    </div>
                  )}
                  {deleteError && <p className="text-xs text-red-600 dark:text-red-400">{deleteError}</p>}
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={deleteCode}
                    onChange={(e) => setDeleteCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit code"
                    aria-label="Deletion code"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-mono text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDeleteStep("idle");
                        setDeleteCode("");
                        setDeleteError(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button variant="danger" className="flex-1" disabled={deleteCode.length !== 6 || deleteLoading} onClick={confirmDelete}>
                      {deleteLoading ? "Deleting…" : "Confirm deletion"}
                    </Button>
                  </div>
                  <button
                    type="button"
                    disabled={deleteLoading}
                    onClick={() => requestDeleteCode(true)}
                    className="text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    Resend code
                  </button>
                </div>
              )}

              {deleteStep === "confirmed" && <p className="text-sm text-muted-foreground">Account deleted. Signing you out…</p>}
            </div>
          </section>
        </aside>
      </div>
    </WorkspaceShell>
  );
}
