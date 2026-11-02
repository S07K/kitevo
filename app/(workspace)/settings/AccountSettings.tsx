"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, MapPin, Pencil } from "lucide-react";
import { Panel } from "@/app/components/workspace/WorkspaceShell";
import { Button, ButtonLink } from "@/app/components/workspace/Button";
import { AvatarImg } from "@/app/components/AvatarImg";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import { APP_HOST } from "@/lib/app-url";
import type { AccountProfile } from "@/lib/profile-types";

/**
 * Settings shows the profile; it's edited in the kit editor (one place for everything brands
 * see). This card summarises it and links straight to the editor's Profile card.
 */
export function ProfileSummaryPanel({ profile, kitId }: { profile: AccountProfile; kitId: string | null }) {
  const editHref = kitId ? `/kit/edit?id=${encodeURIComponent(kitId)}&section=profile` : "/dashboard";
  const links = profile.links?.length ?? 0;
  return (
    <Panel
      title={
        <span className="inline-flex items-center gap-1.5">
          Your profile <VerifiedBadge tier={profile.verifiedTier} size="sm" />
        </span>
      }
      action={
        profile.username ? (
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
    >
      <div className="flex items-start gap-4">
        <AvatarImg
          src={profile.avatarUrl}
          className="h-14 w-14 shrink-0 rounded-full object-cover"
          fallback={
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
              {(profile.name || profile.username || "?").charAt(0).toUpperCase()}
            </span>
          }
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-lg font-semibold text-foreground">{profile.name || "Add your name"}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {profile.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} aria-hidden /> {profile.location}
              </span>
            )}
            <span>{links === 0 ? "No contact links" : `${links} contact link${links === 1 ? "" : "s"}`}</span>
          </div>
          {(profile.niches?.length ?? 0) > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1">
              {profile.niches!.map((n) => (
                <li key={n} className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary-soft-foreground">{n}</li>
              ))}
            </ul>
          )}
          <p className={`mt-3 line-clamp-2 text-sm leading-relaxed ${profile.bio ? "text-foreground" : "text-muted-foreground"}`}>
            {profile.bio || "No bio yet."}
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          Your photo, name, bio, niches and contact links are edited in the kit editor, where you can see them on your kit as you type.
        </p>
        <ButtonLink href={editHref} variant="primary" size="sm">
          <Pencil size={13} aria-hidden /> {kitId ? "Edit in kit editor" : "Create your kit"}
        </ButtonLink>
      </div>
    </Panel>
  );
}

const clean = (u: string) => u.trim().toLowerCase().replace(/\s+/g, "-");

/** The username is the account's public address, so it stays in Settings. */
export function UsernamePanel({ username, onSaved }: { username: string; onSaved: (u: string) => void }) {
  const [value, setValue] = useState(username);
  const [check, setCheck] = useState<{ state: "idle" | "checking" | "ok" | "taken"; error?: string }>({ state: "idle" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = clean(value);
  const changed = next !== username;

  // Debounced availability check for a changed username.
  useEffect(() => {
    if (!changed || !next) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setCheck({ state: "checking" });
      try {
        const res = await fetch(`/api/me/username-check?username=${encodeURIComponent(next)}`, { credentials: "include" });
        const data = await res.json();
        if (!cancelled) setCheck(data.available ? { state: "ok" } : { state: "taken", error: data.error ?? "That username isn't available." });
      } catch {
        if (!cancelled) setCheck({ state: "idle" });
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [next, changed]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(data.error ?? "Couldn't save your username. Try again.");
      onSaved(data.username ?? next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const showCheck = changed && next !== "";
  const problem = showCheck && check.state === "taken" ? check.error : !next && value !== "" ? "Use letters, numbers and hyphens." : error;
  return (
    <Panel title="Username">
      <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
        Your public address. Changing it breaks links you&apos;ve already shared.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (changed && check.state === "ok") void save();
        }}
        className="flex flex-col gap-2 sm:flex-row sm:items-start"
      >
        <div className="min-w-0 flex-1">
          <label className="flex items-center rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-ring">
            <span className="shrink-0 pl-3.5 text-sm text-muted-foreground">{APP_HOST}/</span>
            <input
              aria-label="Username"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setSaved(false);
                setError(null);
              }}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!!problem || undefined}
              className="min-w-0 flex-1 bg-transparent py-2.5 pr-3.5 text-sm text-foreground focus:outline-none"
            />
          </label>
          <p className={`mt-1.5 text-xs ${problem ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`} aria-live="polite">
            {problem ?? (saved ? "Saved." : showCheck ? (check.state === "checking" ? "Checking…" : check.state === "ok" ? "Available." : " ") : " ")}
          </p>
        </div>
        <Button type="submit" variant="primary" disabled={!changed || check.state !== "ok" || saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </form>
    </Panel>
  );
}
