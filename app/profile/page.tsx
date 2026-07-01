"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppNav } from "../components/AppNav";
import { ProfileForm, type ProfileFormProfile } from "../components/ProfileForm";
import { signOut } from "next-auth/react";
import type { ProfilePayload } from "@/app/api/me/profile/route";

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

  // Plan
  const [tierName, setTierName] = useState<string | null>(null);
  const [tierId, setTierId] = useState<string | null>(null);
  const [allowedKits, setAllowedKits] = useState(1);
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

    fetch("/api/subscription-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setTierName(data.tierName ?? null);
        setTierId(data.tierId ?? null);
        setAllowedKits(typeof data.allowedKits === "number" ? data.allowedKits : 1);
      })
      .catch(() => {});
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
        setProfile((p) => (p ? { ...p, ...updated } : null));
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

  return (
    <div className="min-h-screen bg-muted/20">
      <AppNav
        links={[{ href: "/dashboard", label: "Dashboard" }]}
        onLogout={async () => {
          await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
          signOut({ callbackUrl: "/" });
        }}
      />

      <main className="mx-auto max-w-4xl px-5 pb-24 pt-24 sm:px-8">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to dashboard
        </Link>

        <h1 className="font-display text-foreground mt-4 text-2xl font-semibold tracking-tight">Profile & settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your public profile, connected accounts, and billing.</p>

        {saved && (
          <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Profile saved successfully.
          </div>
        )}
        {saveError && (
          <div className="mt-5 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span>{saveError}</span>
            <button type="button" onClick={() => setSaveError(null)} className="ml-3 text-xs text-red-600 hover:underline">Dismiss</button>
          </div>
        )}

        {/* Profile form */}
        <div className="bg-background border-border mt-6 rounded-2xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">Profile</p>
            {profile?.username && (
              <Link
                href={`/${profile.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
              >
                View public profile →
              </Link>
            )}
          </div>
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-20 w-20 rounded-full bg-muted" />
              <div className="h-4 bg-muted rounded-full w-1/2" />
              <div className="h-4 bg-muted rounded-full w-2/3" />
              <div className="h-20 bg-muted rounded-xl" />
            </div>
          ) : profile ? (
            <ProfileForm
              profile={profile}
              externalError={saveError}
              isBrand={profile.accountType === "brand"}
              onAvatarUrlChange={(url) => setProfile((p) => (p ? { ...p, avatarUrl: url } : null))}
              onSave={handleSave}
              saving={saving}
              submitLabel={saving ? "Saving…" : "Save profile"}
            />
          ) : (
            <p className="text-muted-foreground text-sm">Could not load profile. <Link href="/dashboard" className="underline">Go back</Link>.</p>
          )}
        </div>

        {/* Instagram + Plan row */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Instagram (creators only) OR Brand settings card */}
          {profile?.accountType === "brand" ? (
            <div className="bg-background border-border rounded-2xl border p-6">
              <div className="flex items-center gap-2 mb-3">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
                </svg>
                <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">Brand profile</p>
              </div>
              <p className="text-muted-foreground text-sm mb-3">Update your company info, industry, and campaign budget range.</p>
              <a
                href="/brand?tab=settings"
                className="bg-foreground text-background inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-80"
              >
                Edit brand profile →
              </a>
            </div>
          ) : (
            <div className="bg-background border-border rounded-2xl border p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                    <rect width="20" height="20" x="2" y="2" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                  </svg>
                  <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">Instagram</p>
                </div>
                {instagramConnected && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Connected
                  </span>
                )}
              </div>
              {instagramConnected ? (
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">Your stats are live on your kit.</p>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="text-muted-foreground hover:text-foreground text-xs transition-colors disabled:opacity-50"
                  >
                    {disconnecting ? "Disconnecting…" : "Disconnect"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-muted-foreground text-sm">Connect to pull live stats into your kit.</p>
                  <a
                    href="/api/instagram/connect"
                    className="bg-foreground text-background inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-80"
                  >
                    Connect Instagram →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Plan */}
          <div className="bg-background border-border rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">Plan</p>
              </div>
              {tierName && (
                <span className="bg-foreground text-background rounded-full px-2.5 py-0.5 text-[11px] font-semibold">{tierName}</span>
              )}
            </div>
            <p className="text-muted-foreground text-sm mb-4">{allowedKits} kit{allowedKits !== 1 ? "s" : ""} included on your plan.</p>
            <div className="flex flex-wrap gap-2">
              {tierId === "starter" && (
                <button
                  type="button"
                  onClick={upgradeToPro}
                  disabled={upgradeLoading}
                  className="bg-foreground text-background inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  {upgradeLoading ? "Upgrading…" : "Upgrade to Pro"}
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

        {/* Account */}
        <div className="mt-4 rounded-2xl border border-border p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">Account</p>
            <p className="text-muted-foreground text-sm mt-0.5">Signed in as {profile?.email ?? "—"}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
              signOut({ callbackUrl: "/" });
            }}
            className="text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
          >
            Sign out →
          </button>
        </div>

        {/* Delete account */}
        <div className="mt-4 rounded-2xl border border-red-100 dark:border-red-950 bg-red-50/40 dark:bg-red-950/20 p-5">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-red-500">Danger zone</p>

          {deleteStep === "idle" && (
            <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-foreground">Delete account</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently deletes your account, all kits, and data. This cannot be undone.
                </p>
              </div>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteError(null);
                  setDeleteLoading(true);
                  try {
                    const res = await fetch("/api/me/delete-account", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "request" }),
                      credentials: "include",
                    });
                    const data = await res.json();
                    if (!res.ok) { setDeleteError(data.error ?? "Failed to send code"); return; }
                    setDeleteSentTo(data.email);
                    setDeleteDevCode(data.devCode ?? null);
                    setDeleteStep("sent");
                  } finally {
                    setDeleteLoading(false);
                  }
                }}
                className="shrink-0 inline-flex h-9 items-center rounded-full border border-red-200 px-4 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? "Sending…" : "Delete account"}
              </button>
            </div>
          )}

          {deleteStep === "sent" && (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-foreground">
                We sent a 6-digit code to <strong>{deleteSentTo}</strong>. Enter it below to confirm deletion.
              </p>
              {deleteDevCode && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 font-mono">
                  <span className="font-sans font-semibold">Dev mode — email failed, code: </span>{deleteDevCode}
                </div>
              )}
              {deleteError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={deleteCode}
                  onChange={(e) => setDeleteCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  className="w-36 border border-border rounded-xl px-4 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-300 tracking-widest font-mono"
                />
                <button
                  type="button"
                  disabled={deleteCode.length !== 6 || deleteLoading}
                  onClick={async () => {
                    setDeleteError(null);
                    setDeleteLoading(true);
                    try {
                      const res = await fetch("/api/me/delete-account", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "confirm", code: deleteCode }),
                        credentials: "include",
                      });
                      const data = await res.json();
                      if (!res.ok) { setDeleteError(data.error ?? "Failed to confirm"); return; }
                      // Account deleted — sign out and redirect
                      setDeleteStep("confirmed");
                      await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
                      signOut({ callbackUrl: "/?deleted=1" });
                    } finally {
                      setDeleteLoading(false);
                    }
                  }}
                  className="inline-flex h-9 items-center rounded-full bg-red-600 px-5 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-40"
                >
                  {deleteLoading ? "Deleting…" : "Confirm deletion"}
                </button>
                <button
                  type="button"
                  onClick={() => { setDeleteStep("idle"); setDeleteCode(""); setDeleteError(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={async () => {
                  setDeleteError(null);
                  setDeleteLoading(true);
                  try {
                    const res = await fetch("/api/me/delete-account", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "request" }),
                      credentials: "include",
                    });
                    if (res.ok) {
                      const d = await res.json();
                      setDeleteCode("");
                      setDeleteDevCode(d.devCode ?? null);
                    }
                  } finally { setDeleteLoading(false); }
                }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              >
                Resend code
              </button>
            </div>
          )}

          {deleteStep === "confirmed" && (
            <p className="mt-3 text-sm text-muted-foreground">Account deleted. Signing you out…</p>
          )}
        </div>
      </main>
    </div>
  );
}
