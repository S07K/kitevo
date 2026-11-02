"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Camera, Check, Lock, Plus, X } from "lucide-react";
import { BRAND_LOGO_RATIO_OPTIONS, type BrandPartner, type KitRates, type RateItem } from "@/lib/mock-data";
import { DEFAULT_SECTION_VISIBILITY, type SectionVisibility } from "@/lib/kit-storage";
import {
  BASIC_PRESETS,
  BRAND_KIT_VIBES,
  BRAND_KIT_VIBE_META,
  DEFAULT_KIT_APPEARANCE,
  KIT_APPEARANCE_PRESET_LABELS,
  parseKitAppearance,
  presetSwatch,
  type KitAppearance,
} from "@/lib/kit-appearance";
import { normalizeManualStats, type ManualStats } from "@/lib/manual-stats";
import { EMPTY_RATES, MAX_RATE_ITEMS, normalizeRates } from "@/lib/kit-rates";
import { KitEditorSkeleton } from "@/app/components/Skeleton";
import { CalculatorRatesOffer } from "./CalculatorRatesOffer";
import { Button, ButtonLink } from "@/app/components/workspace/Button";
import { CREATOR_NICHES, MAX_NICHES } from "@/lib/niches";
import { MAX_LINKS, MAX_LINK_LABEL, MAX_LOCATION, normalizeLinkUrl } from "@/lib/profile-links";
import { resizeImageFileToJpegDataUrl } from "@/lib/resize-image";
import type { KitSectionKind } from "@/app/kit/[username]/MediaKitClient";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type LoadedKit = { id: string; name: string; slug: string };

const AUTOSAVE_MS = 800;

const fieldCls =
  "w-full min-w-0 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-ring/40";

const newId = () => Math.random().toString(36).slice(2, 11);

/* ─── Small building blocks ─────────────────────────────────────────────── */


/** Editor card ids. The preview maps each kit section to one of these (EDITOR_TARGET). */
export type EditorSectionId = "style" | "profile" | "numbers" | "live" | "brands" | "rates" | "contact";

/** Which editor card (and row) a tapped kit section opens. */
export const EDITOR_TARGET: Record<KitSectionKind, { section: EditorSectionId; row?: string; label: string }> = {
  profile: { section: "profile", label: "Edit profile" },
  numbers: { section: "numbers", label: "Edit numbers" },
  audience: { section: "live", row: "audience", label: "Audience settings" },
  posts: { section: "live", row: "posts", label: "Posts settings" },
  youtube: { section: "live", row: "posts", label: "Videos settings" },
  growth: { section: "live", row: "growth", label: "Growth settings" },
  brands: { section: "brands", label: "Edit brands" },
  rates: { section: "rates", label: "Edit rates" },
  contact: { section: "contact", label: "Edit contact" },
};

/** Window event the preview fires when a kit section is tapped. */
export const EDIT_SECTION_EVENT = "kitevo:edit-section";

function Section({
  id,
  title,
  hint,
  badge,
  flashed,
  children,
}: {
  id: EditorSectionId;
  title: string;
  hint?: ReactNode;
  badge?: ReactNode;
  flashed?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      data-editor-section={id}
      aria-labelledby={`ed-${id}`}
      className={`scroll-mt-4 rounded-2xl border bg-background p-5 transition-[box-shadow,border-color] duration-300 sm:p-6 ${
        flashed ? "border-primary shadow-[0_0_0_3px_var(--color-primary-soft)]" : "border-border"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`ed-${id}`} className="text-sm font-semibold text-foreground">{title}</h2>
          {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

/** "Shared by all your kits": profile and contact live on the account, not the kit. */
function SharedBadge() {
  return <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">All your kits</span>;
}

function PlanBadge({ plan }: { plan: string }) {
  return <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary-soft-foreground">{plan}</span>;
}

/** Accessible on/off switch. */
function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "bg-primary" : "bg-muted ring-1 ring-inset ring-border"
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
    </button>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  prefix,
  min = 0,
  step = 1,
  hint,
}: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  suffix?: string;
  prefix?: string;
  min?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{prefix}</span>}
        <input
          id={id}
          type="number"
          min={min}
          step={step}
          inputMode="decimal"
          placeholder="—"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className={`${fieldCls} ${prefix ? "pl-7" : ""} ${suffix ? "pr-8" : ""}`}
        />
        {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}


const MAX_BIO = 300;

/** Photo, name, location, niches, bio. Photo uploads save at once; the rest autosaves. */
function ProfileFields({ profile, onChange }: { profile: ProfileDraft; onChange: (patch: Partial<ProfileDraft>) => void }) {
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPhotoError("Choose an image file (JPG, PNG or WebP).");
    if (file.size > 8 * 1024 * 1024) return setPhotoError("That image is over 8MB. Choose a smaller one.");
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const avatarDataUrl = await resizeImageFileToJpegDataUrl(file);
      const res = await fetch("/api/me/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatarDataUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "The photo didn't upload. Try again.");
      onChange({ avatarUrl: json.avatarUrl ?? avatarDataUrl });
      window.dispatchEvent(new CustomEvent("kitevo:avatar-updated", { detail: { avatarUrl: json.avatarUrl ?? avatarDataUrl } }));
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "The photo didn't upload. Try again.");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const toggleNiche = (n: string) =>
    onChange({
      niches: profile.niches.includes(n) ? profile.niches.filter((x) => x !== n) : profile.niches.length < MAX_NICHES ? [...profile.niches, n] : profile.niches,
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={photoBusy}
          aria-label="Change photo"
          className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- base64 data URL
            <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">{(profile.name || "?").charAt(0).toUpperCase()}</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Camera size={18} aria-hidden />
          </span>
        </button>
        <div className="min-w-0">
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={photoBusy}>
            {photoBusy ? "Uploading…" : profile.avatarUrl ? "Change photo" : "Add a photo"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">A clear photo of your face works best. Saves right away.</p>
          {photoError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{photoError}</p>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => pickPhoto(e.target.files?.[0])} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pf-name" className="mb-1.5 block text-xs font-medium text-muted-foreground">Name</label>
          <input id="pf-name" value={profile.name} maxLength={60} onChange={(e) => onChange({ name: e.target.value })} placeholder="Your name" className={fieldCls} />
        </div>
        <div>
          <label htmlFor="pf-loc" className="mb-1.5 block text-xs font-medium text-muted-foreground">Location</label>
          <input id="pf-loc" value={profile.location} maxLength={MAX_LOCATION} onChange={(e) => onChange({ location: e.target.value })} placeholder="e.g. Mexico City" className={fieldCls} />
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span id="pf-niches" className="text-xs font-medium text-muted-foreground">What you make</span>
          <span className="text-xs tabular-nums text-muted-foreground">{profile.niches.length}/{MAX_NICHES}</span>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby="pf-niches">
          {CREATOR_NICHES.map((n) => {
            const on = profile.niches.includes(n);
            const full = !on && profile.niches.length >= MAX_NICHES;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                disabled={full}
                onClick={() => toggleNiche(n)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <label htmlFor="pf-bio" className="text-xs font-medium text-muted-foreground">Bio</label>
          <span className={`text-xs tabular-nums ${profile.bio.length > MAX_BIO - 20 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
            {profile.bio.length}/{MAX_BIO}
          </span>
        </div>
        <textarea
          id="pf-bio"
          rows={3}
          value={profile.bio}
          maxLength={MAX_BIO}
          onChange={(e) => onChange({ bio: e.target.value })}
          placeholder="What you make and who it's for, in a sentence or two."
          className={`${fieldCls} resize-none leading-relaxed`}
        />
      </div>
    </div>
  );
}

/** Contact links (label + address). Addresses are checked as you type, the same way the server checks them. */
function LinksField({ links, onChange, disabled }: { links: ProfileLinkDraft[]; onChange: (links: ProfileLinkDraft[]) => void; disabled?: boolean }) {
  const set = (id: string, patch: Partial<ProfileLinkDraft>) => onChange(links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  return (
    <div className={`space-y-2 ${disabled ? "opacity-60" : ""}`}>
      {links.length === 0 && <p className="text-sm text-muted-foreground">Add at least one way to reach you: your email, or a link to your booking page.</p>}
      {links.map((l, i) => {
        const bad = l.url.trim() !== "" && !normalizeLinkUrl(l.url);
        return (
          <div key={l.id}>
            <div className="flex items-start gap-2">
              <input
                aria-label={`Link ${i + 1} label`}
                value={l.label}
                maxLength={MAX_LINK_LABEL}
                onChange={(e) => set(l.id, { label: e.target.value })}
                placeholder="e.g. Email me"
                className={`${fieldCls} w-36 shrink-0 sm:w-44`}
              />
              <input
                aria-label={`Link ${i + 1} address`}
                aria-invalid={bad || undefined}
                value={l.url}
                onChange={(e) => set(l.id, { url: e.target.value })}
                placeholder="you@email.com or website"
                className={`${fieldCls} flex-1 ${bad ? "border-red-400 dark:border-red-500/70" : ""}`}
              />
              <button
                type="button"
                onClick={() => onChange(links.filter((x) => x.id !== l.id))}
                aria-label={`Remove ${l.label || `link ${i + 1}`}`}
                className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
              >
                <X size={15} aria-hidden />
              </button>
            </div>
            {bad && <p className="mt-1 text-xs text-red-600 dark:text-red-400">Use a web address (like yoursite.com) or an email. This link won&apos;t show until it&apos;s fixed.</p>}
          </div>
        );
      })}
      {links.length < MAX_LINKS && (
        <Button size="sm" variant="ghost" onClick={() => onChange([...links, { id: newId(), label: "", url: "" }])}>
          <Plus size={14} aria-hidden /> Add a link
        </Button>
      )}
    </div>
  );
}

/* ─── Editor ────────────────────────────────────────────────────────────── */

interface KitEditorProps {
  kitId: string | null;
  tierId?: string | null;
  /** After the kit loads (name/slug for the page header and preview). */
  onLoaded?: (kit: LoadedKit) => void;
  /** After each successful save, with the kit's public slug (refreshes the preview). */
  onSaved?: (slug: string) => void;
  onStatusChange?: (status: SaveStatus) => void;
  /** Lets the page header offer "Retry" after a failed save. */
  registerRetry?: (retry: () => void) => void;
  /** Every change (and the initial load), so the live preview can render the draft. */
  onDraftChange?: (draft: KitDraft) => void;
}

export type ProfileLinkDraft = { id: string; label: string; url: string };

/** Account-level fields shown on every kit. Saved to /api/me/profile, not the kit. */
export type ProfileDraft = {
  name: string;
  bio: string;
  location: string;
  niches: string[];
  links: ProfileLinkDraft[];
  /** Saved immediately on upload (not autosaved); here so the preview shows it. */
  avatarUrl: string | null;
};

/** The editable part of a kit plus the shared profile; the live preview renders straight from it. */
export type KitDraft = {
  rates: KitRates;
  brands: BrandPartner[];
  sectionVisibility: SectionVisibility;
  appearance: KitAppearance;
  manualStats: ManualStats;
  profile: ProfileDraft;
};

const kitPart = (d: KitDraft) => ({
  rates: d.rates,
  brands: d.brands,
  // The rate card's visibility is controlled in the Rates section only.
  sectionVisibility: { ...d.sectionVisibility, rates: d.rates.show },
  appearance: d.appearance,
  manualStats: d.manualStats,
});
const profilePart = (p: ProfileDraft) => ({
  name: p.name,
  bio: p.bio,
  location: p.location,
  niches: p.niches,
  // Only links that will survive the server's check (lib/profile-links).
  links: p.links.filter((l) => normalizeLinkUrl(l.url)).map((l) => ({ label: l.label, url: l.url })),
});

export function KitEditor({ kitId, tierId, onLoaded, onSaved, onStatusChange, registerRetry, onDraftChange }: KitEditorProps) {
  const isPro = tierId === "pro";
  const isFree = !tierId || tierId === "free";

  const [draft, setDraft] = useState<KitDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ section: EditorSectionId; row?: string } | null>(null);

  // Autosave bookkeeping: skip the first render after load, coalesce rapid edits, never run
  // two saves at once (the newest draft is saved right after an in-flight one finishes).
  const loaded = useRef(false);
  const inFlight = useRef(false);
  const pending = useRef<KitDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Last saved JSON of each half, so a profile edit doesn't re-save the kit and vice versa.
  const savedKit = useRef("");
  const savedProfile = useRef("");
  const cbs = useRef({ onSaved, onStatusChange, onDraftChange });
  useEffect(() => {
    cbs.current = { onSaved, onStatusChange, onDraftChange };
  });

  /* Load the kit and the shared profile together */
  useEffect(() => {
    if (!kitId) return;
    let cancelled = false;
    loaded.current = false;
    Promise.all([
      fetch(`/api/kits/${kitId}`, { credentials: "include" }).then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "This kit doesn't exist or isn't yours." : "Couldn't load your kit. Refresh to try again.");
        return r.json();
      }),
      fetch("/api/me/profile", { credentials: "include" }).then(
        (r) => (r.ok ? r.json() : {}) as Promise<{ name?: unknown; bio?: unknown; location?: unknown; niches?: unknown; links?: unknown; avatarUrl?: unknown }>,
      ),
    ])
      .then(([data, p]) => {
        if (cancelled) return;
        const d: KitDraft = {
          rates: normalizeRates(data.rates ?? EMPTY_RATES),
          brands: Array.isArray(data.brands) ? data.brands : [],
          sectionVisibility: { ...DEFAULT_SECTION_VISIBILITY, ...(data.sectionVisibility && typeof data.sectionVisibility === "object" ? data.sectionVisibility : {}) },
          appearance:
            data.appearance && typeof data.appearance === "object"
              ? parseKitAppearance(JSON.stringify(data.appearance))
              : typeof data.appearance === "string"
                ? parseKitAppearance(data.appearance)
                : DEFAULT_KIT_APPEARANCE,
          manualStats: normalizeManualStats(data.manualStats),
          profile: {
            name: typeof p.name === "string" ? p.name : "",
            bio: typeof p.bio === "string" ? p.bio : "",
            location: typeof p.location === "string" ? p.location : "",
            niches: Array.isArray(p.niches) ? p.niches.filter((n: unknown): n is string => typeof n === "string") : [],
            links: Array.isArray(p.links)
              ? (p.links as { label?: unknown; url?: unknown }[])
                  .filter((l) => typeof l?.url === "string")
                  // Show emails as plain addresses; normalizeLinkUrl adds mailto: back on save.
                  .map((l) => ({ id: newId(), label: typeof l.label === "string" ? l.label : "", url: (l.url as string).replace(/^mailto:/i, "") }))
              : [],
            avatarUrl: typeof p.avatarUrl === "string" ? p.avatarUrl : null,
          },
        };
        savedKit.current = JSON.stringify(kitPart(d));
        savedProfile.current = JSON.stringify(profilePart(d.profile));
        setDraft(d);
        onLoaded?.({ id: data.id ?? kitId, name: data.name ?? "Untitled kit", slug: data.slug ?? "" });
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitId]);

  /* Save: the kit and the profile separately, each only when it changed */
  const persist = useCallback(
    async (d: KitDraft) => {
      if (!kitId) return;
      if (inFlight.current) {
        pending.current = d;
        return;
      }
      const kitJson = JSON.stringify(kitPart(d));
      const profileJson = JSON.stringify(profilePart(d.profile));
      const kitChanged = kitJson !== savedKit.current;
      const profileChanged = profileJson !== savedProfile.current;
      if (!kitChanged && !profileChanged) return;
      inFlight.current = true;
      cbs.current.onStatusChange?.("saving");
      try {
        const [kitRes, profileRes] = await Promise.all([
          kitChanged
            ? fetch(`/api/kits/${kitId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: kitJson })
            : null,
          profileChanged
            ? fetch("/api/me/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: profileJson })
            : null,
        ]);
        if ((kitRes && !kitRes.ok) || (profileRes && !profileRes.ok)) throw new Error();
        if (kitRes) savedKit.current = kitJson;
        if (profileRes) {
          savedProfile.current = profileJson;
          // Name changes show in the sidebar account row and other open surfaces.
          window.dispatchEvent(new Event("kitevo:profile-updated"));
        }
        const data = kitRes ? await kitRes.json().catch(() => ({})) : {};
        cbs.current.onStatusChange?.("saved");
        if (data.slug) cbs.current.onSaved?.(data.slug);
      } catch {
        cbs.current.onStatusChange?.("error");
      } finally {
        inFlight.current = false;
        const next = pending.current;
        pending.current = null;
        if (next) void persist(next);
      }
    },
    [kitId],
  );

  // Live preview: report every draft immediately (no save round-trip).
  useEffect(() => {
    if (draft) cbs.current.onDraftChange?.(draft);
  }, [draft]);

  useEffect(() => {
    if (!draft) return;
    if (!loaded.current) {
      loaded.current = true; // first render after load: nothing changed yet
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(draft), AUTOSAVE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, persist]);

  // Retry from the page header saves the current draft immediately.
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  });
  useEffect(() => {
    registerRetry?.(() => {
      if (!draftRef.current) return;
      savedKit.current = ""; // force both halves to save
      savedProfile.current = "";
      void persist(draftRef.current);
    });
  }, [registerRetry, persist]);

  /* Tapping a section in the preview opens its card here */
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const onEdit = (e: Event) => {
      const target = (e as CustomEvent<{ section: EditorSectionId; row?: string }>).detail;
      if (!target?.section) return;
      const el = document.querySelector<HTMLElement>(`[data-editor-section="${target.section}"]`);
      if (!el) return;
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      const field = (target.row ? el.querySelector<HTMLElement>(`[data-editor-row="${target.row}"]`) : null) ?? el;
      // The first field to type in; the card's on/off switch only when it has no fields.
      (field.querySelector<HTMLElement>('input:not([type="file"]), textarea') ?? field.querySelector<HTMLElement>('button[role="switch"]'))?.focus({ preventScroll: true });
      setFlash(target);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(null), 1800);
    };
    window.addEventListener(EDIT_SECTION_EVENT, onEdit);
    return () => {
      window.removeEventListener(EDIT_SECTION_EVENT, onEdit);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const update = <K extends keyof KitDraft>(key: K, value: KitDraft[K] | ((prev: KitDraft[K]) => KitDraft[K])) =>
    setDraft((d) => (d ? { ...d, [key]: typeof value === "function" ? (value as (p: KitDraft[K]) => KitDraft[K])(d[key]) : value } : d));
  const updateProfile = (patch: Partial<ProfileDraft> | ((p: ProfileDraft) => Partial<ProfileDraft>)) =>
    update("profile", (p) => ({ ...p, ...(typeof patch === "function" ? patch(p) : patch) }));

  /* Render states */
  if (!kitId) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-background p-8 text-center">
        <p className="text-sm text-muted-foreground">Pick a kit to edit from your dashboard.</p>
        <ButtonLink href="/dashboard" className="mt-4">
          Back to dashboard
        </ButtonLink>
      </div>
    );
  }
  if (loadError) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
        {loadError}
        <div className="mt-3">
          <ButtonLink href="/dashboard" size="sm">
            Back to dashboard
          </ButtonLink>
        </div>
      </div>
    );
  }
  if (!draft) return <KitEditorSkeleton />;

  const { rates, brands, sectionVisibility, appearance, manualStats, profile } = draft;
  const validLinks = profile.links.filter((l) => normalizeLinkUrl(l.url));
  const hasLinks = validLinks.length > 0;
  const ctaDestination = isPro ? "your contact form" : hasLinks && sectionVisibility.links ? "your links" : null;
  const flashed = (s: EditorSectionId) => flash?.section === s;
  const rowCls = (row: string) =>
    `flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 -mx-2 transition-colors ${flash?.row === row ? "bg-primary-soft" : ""}`;

  const setRateItem = (id: string, patch: Partial<RateItem>) =>
    update("rates", (r) => ({ ...r, items: (r.items ?? []).map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
  const setVisible = (key: keyof SectionVisibility, v: boolean) => update("sectionVisibility", (sv) => ({ ...sv, [key]: v }));

  return (
    <div className="space-y-5">
      {/* Profile (shared) */}
      <Section
        id="profile"
        flashed={flashed("profile")}
        title="Profile"
        hint="The top of your kit. Changes here show on all your kits."
        badge={<SharedBadge />}
      >
        <ProfileFields profile={profile} onChange={updateProfile} />
      </Section>

      {/* Style */}
      <Section id="style" flashed={flashed("style")} title="Style" hint="How your kit looks to brands. Your stats and rates stay the same in every style.">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Kit style">
          {BASIC_PRESETS.map((preset) => {
            const active = appearance.preset === preset;
            const sw = presetSwatch(preset);
            return (
              <button
                key={preset}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update("appearance", (a) => ({ ...a, preset }))}
                className={`inline-flex h-9 items-center gap-2 rounded-full border pl-2 pr-3.5 text-sm font-medium transition-colors ${
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:bg-muted"
                }`}
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-black/10"
                  style={{ background: `linear-gradient(135deg, ${sw.bg} 50%, ${sw.accent} 50%)` }}
                  aria-hidden
                />
                {KIT_APPEARANCE_PRESET_LABELS[preset]}
              </button>
            );
          })}
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-foreground">Signature styles</p>
            {!isPro && <PlanBadge plan="Pro" />}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Signature style">
            {BRAND_KIT_VIBES.map((vibe) => {
              const meta = BRAND_KIT_VIBE_META[vibe];
              const active = appearance.preset === vibe;
              const bar = meta.bg === "#111110" || meta.bg === "#0A0A14" ? meta.fg : meta.bg;
              return (
                <button
                  key={vibe}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={!isPro}
                  onClick={() => update("appearance", (a) => ({ ...a, preset: vibe }))}
                  className={`flex items-stretch overflow-hidden rounded-xl border text-left transition-colors disabled:cursor-not-allowed ${
                    active ? "border-primary bg-primary-soft" : "border-border hover:bg-muted/60"
                  } ${!isPro ? "opacity-60" : ""}`}
                >
                  <span className="w-1.5 shrink-0" style={{ backgroundColor: bar }} aria-hidden />
                  <span className="min-w-0 flex-1 px-3.5 py-3">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{meta.label}</span>
                      {active ? <Check size={14} className="shrink-0 text-primary" aria-hidden /> : !isPro ? <Lock size={13} className="shrink-0 text-muted-foreground" aria-hidden /> : null}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{meta.tagline}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {!isPro && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary-soft px-4 py-3">
              <p className="text-xs text-primary-soft-foreground">Signature styles come with Pro, along with 3 kits and the brand contact form.</p>
              <ButtonLink href="/pricing?plan=pro" size="sm" variant="primary">
                See Pro
              </ButtonLink>
            </div>
          )}
        </div>
      </Section>

      {/* Numbers */}
      <Section
        id="numbers"
        flashed={flashed("numbers")}
        title="Headline numbers"
        hint="Your kit opens with a sentence written from these numbers and your connected accounts. Self-reported numbers are labelled as such; on Starter and Pro, live data replaces them for any platform you connect."
        badge={<Switch checked={sectionVisibility.stats} onChange={(v) => setVisible("stats", v)} label="Show headline numbers" />}
      >
        {!sectionVisibility.stats ? (
          <p className="text-sm text-muted-foreground">Hidden. Your kit starts with your profile and goes straight to the sections below.</p>
        ) : (
          <>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField id="ms-igf" label="Instagram followers" value={manualStats.instagramFollowers} onChange={(v) => update("manualStats", (s) => ({ ...s, instagramFollowers: v }))} />
          <NumberField
            id="ms-ige"
            label="Instagram engagement rate"
            value={manualStats.instagramEngagement}
            onChange={(v) => update("manualStats", (s) => ({ ...s, instagramEngagement: v }))}
            suffix="%"
            step={0.1}
            hint="Average across recent posts"
          />
          <NumberField id="ms-yts" label="YouTube subscribers" value={manualStats.youtubeSubscribers} onChange={(v) => update("manualStats", (s) => ({ ...s, youtubeSubscribers: v }))} />
          <NumberField id="ms-ytv" label="YouTube total views" value={manualStats.youtubeTotalViews} onChange={(v) => update("manualStats", (s) => ({ ...s, youtubeTotalViews: v }))} />
          <NumberField
            id="ms-gr"
            label="Follower growth, last 30 days"
            value={manualStats.growthThisMonth}
            onChange={(v) => update("manualStats", (s) => ({ ...s, growthThisMonth: v }))}
            suffix="%"
            step={0.1}
            min={-100}
            hint="Shown only when positive"
          />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Growth charts and audience breakdowns only come from connected platforms; manual numbers never become a chart.</p>
          </>
        )}
      </Section>

      {/* From connected accounts */}
      <Section id="live" flashed={flashed("live")} title="From your accounts" hint="Filled in automatically from Instagram and YouTube. Choose what brands see.">
        <ul className="divide-y divide-border">
          {(
            [
              { row: "audience", key: "audience", label: "Audience: age, gender, top countries", starter: true },
              { row: "posts", key: "workSamples", label: "Recent posts and YouTube videos", starter: false },
              { row: "growth", key: "growthChart", label: "Follower growth chart", starter: true },
            ] as const
          ).map(({ row, key, label, starter }) => {
            const locked = isFree && starter;
            return (
              <li key={row} data-editor-row={row} className={rowCls(row)}>
                <span className={`text-sm ${locked ? "text-muted-foreground" : "text-foreground"}`}>{label}</span>
                <span className="flex items-center gap-2">
                  {locked && (
                    <Link href="/pricing?plan=starter" className="text-xs font-medium text-primary hover:underline">
                      Starter
                    </Link>
                  )}
                  <Switch checked={!locked && sectionVisibility[key] !== false} disabled={locked} onChange={(v) => setVisible(key, v)} label={label} />
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Nothing here yet? <Link href="/settings" className="font-medium text-foreground underline underline-offset-2">Connect Instagram or YouTube</Link>. Self-reported numbers never become charts.
        </p>
      </Section>

      {/* Brands */}
      <Section
        id="brands"
        flashed={flashed("brands")}
        title="Brands you've worked with"
        hint="Past partners, for social proof. Add a logo URL to show the logo instead of the name."
        badge={<Switch checked={sectionVisibility.brands} onChange={(v) => setVisible("brands", v)} label="Show brands on my kit" />}
      >
        <div className="space-y-3">
          {brands.length === 0 && <p className="text-sm text-muted-foreground">No brands yet.</p>}
          {brands.map((b) => (
            <div key={b.id} className="rounded-xl border border-border p-3.5">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white">
                  {b.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- creator-supplied external URL
                    <img src={b.logoUrl} alt="" className="max-h-8 max-w-[40px] object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-sm font-semibold text-[#556b84]">{(b.name || "?").charAt(0).toUpperCase()}</span>
                  )}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input aria-label="Brand name" value={b.name} onChange={(e) => update("brands", (bs) => bs.map((x) => (x.id === b.id ? { ...x, name: e.target.value } : x)))} placeholder="Brand name" className={fieldCls} />
                    <input aria-label="Tagline" value={b.tagline ?? ""} onChange={(e) => update("brands", (bs) => bs.map((x) => (x.id === b.id ? { ...x, tagline: e.target.value } : x)))} placeholder="e.g. Spring campaign, 2026" className={fieldCls} />
                  </div>
                  <input
                    aria-label="Logo URL"
                    type="url"
                    value={b.logoUrl ?? ""}
                    onChange={(e) => update("brands", (bs) => bs.map((x) => (x.id === b.id ? { ...x, logoUrl: e.target.value || undefined } : x)))}
                    placeholder="Logo URL (optional)"
                    className={fieldCls}
                  />
                  {b.logoUrl && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Logo shape</span>
                      <div className="inline-flex rounded-full bg-muted p-0.5" role="radiogroup" aria-label="Logo shape">
                        {BRAND_LOGO_RATIO_OPTIONS.map((o) => {
                          const on = (b.logoRatio ?? "auto") === o.value;
                          return (
                            <button
                              key={o.value}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              onClick={() => update("brands", (bs) => bs.map((x) => (x.id === b.id ? { ...x, logoRatio: o.value } : x)))}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                              {o.short}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => update("brands", (bs) => bs.filter((x) => x.id !== b.id))}
                  aria-label={`Remove ${b.name || "brand"}`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                >
                  <X size={15} aria-hidden />
                </button>
              </div>
            </div>
          ))}
          <Button size="sm" variant="ghost" onClick={() => update("brands", (bs) => [...bs, { id: newId(), name: "", tagline: "" }])}>
            <Plus size={14} aria-hidden /> Add a brand
          </Button>
        </div>
      </Section>

      {/* Rates */}
      <Section
        id="rates"
        flashed={flashed("rates")}
        title="Rates"
        hint="What you charge per deliverable. Brands decide faster when prices are on the kit."
        badge={<Switch checked={rates.show} onChange={(show) => update("rates", (r) => ({ ...r, show }))} label="Show rates on my kit" />}
      >
        {!(rates.items ?? []).some((it) => it.label.trim() && typeof it.price === "number") && (
          <CalculatorRatesOffer
            onUse={(items) =>
              update("rates", (r) => ({ ...r, show: true, items: items.slice(0, MAX_RATE_ITEMS).map((i) => ({ id: newId(), label: i.label, price: i.price })) }))
            }
          />
        )}
        {!rates.show ? (
          <p className="text-sm text-muted-foreground">Rates are hidden on your kit. Turn them on to add your prices.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {(rates.items ?? []).map((it, i) => (
                <div key={it.id} className="flex items-center gap-2">
                  <input
                    aria-label={`Deliverable ${i + 1}`}
                    value={it.label}
                    maxLength={60}
                    onChange={(e) => setRateItem(it.id, { label: e.target.value })}
                    placeholder="e.g. Instagram Reel"
                    className={`${fieldCls} flex-1`}
                  />
                  <div className="relative w-28 shrink-0">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input
                      aria-label={`Price for deliverable ${i + 1}`}
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={it.price ?? ""}
                      onChange={(e) => setRateItem(it.id, { price: e.target.value === "" ? undefined : Number(e.target.value) })}
                      placeholder="450"
                      className={`${fieldCls} pl-7`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => update("rates", (r) => ({ ...r, items: (r.items ?? []).filter((x) => x.id !== it.id) }))}
                    aria-label={`Remove ${it.label || `deliverable ${i + 1}`}`}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                  >
                    <X size={15} aria-hidden />
                  </button>
                </div>
              ))}
              {(rates.items ?? []).length < MAX_RATE_ITEMS && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => update("rates", (r) => ({ ...r, items: [...(r.items ?? []), { id: newId(), label: "" }] }))}
                >
                  <Plus size={14} aria-hidden /> Add a deliverable
                </Button>
              )}
            </div>

            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              <NumberField
                id="rates-from"
                label="Custom packages from (optional)"
                prefix="$"
                value={rates.fromAmount}
                onChange={(fromAmount) => update("rates", (r) => ({ ...r, fromAmount }))}
                hint="Shown under your list, or on its own if you add no items."
              />
              <div>
                <label htmlFor="rates-cta" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Button label
                </label>
                <input
                  id="rates-cta"
                  value={rates.ctaLabel ?? ""}
                  maxLength={40}
                  onChange={(e) => update("rates", (r) => ({ ...r, ctaLabel: e.target.value || undefined }))}
                  placeholder="Work with me"
                  className={fieldCls}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {ctaDestination ? `Takes brands to ${ctaDestination}.` : "Hidden until you add a contact link below or get the Pro contact form."}
                </p>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* Contact (links shared; form is Pro) */}
      <Section
        id="contact"
        flashed={flashed("contact")}
        title="Contact"
        hint="How brands reach you. The rate card's button and the sticky bar on phones point here."
        badge={<Switch checked={sectionVisibility.links} onChange={(v) => setVisible("links", v)} label="Show contact links on my kit" />}
      >
        <LinksField links={profile.links} onChange={(links) => updateProfile({ links })} disabled={!sectionVisibility.links} />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/60 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {isPro ? "Your brand contact form is on: brands can send you a brief straight from your kit." : "Let brands send you a brief from your kit with the contact form."}
          </p>
          {!isPro && (
            <ButtonLink href="/pricing?plan=pro" size="sm">
              Get it with Pro
            </ButtonLink>
          )}
        </div>
      </Section>
    </div>
  );
}
