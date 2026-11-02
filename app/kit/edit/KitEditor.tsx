"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, Lock, Plus, X } from "lucide-react";
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
import { Button, ButtonLink } from "@/app/components/workspace/Button";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type LoadedKit = { id: string; name: string; slug: string };

const AUTOSAVE_MS = 800;

const fieldCls =
  "w-full min-w-0 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-ring/40";

const newId = () => Math.random().toString(36).slice(2, 11);

/* ─── Small building blocks ─────────────────────────────────────────────── */

function Section({ title, hint, badge, children }: { title: string; hint?: ReactNode; badge?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-background p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
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

/** The editable part of a kit; the live preview renders straight from it. */
export type KitDraft = {
  rates: KitRates;
  brands: BrandPartner[];
  sectionVisibility: SectionVisibility;
  appearance: KitAppearance;
  manualStats: ManualStats;
};

export function KitEditor({ kitId, tierId, onLoaded, onSaved, onStatusChange, registerRetry, onDraftChange }: KitEditorProps) {
  const isPro = tierId === "pro";
  const isFree = !tierId || tierId === "free";

  const [draft, setDraft] = useState<KitDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasInquiryForm, setHasInquiryForm] = useState(false);
  const [hasLinks, setHasLinks] = useState(false);

  // Autosave bookkeeping: skip the first render after load, coalesce rapid edits, never run
  // two saves at once (the newest draft is saved right after an in-flight one finishes).
  const loaded = useRef(false);
  const inFlight = useRef(false);
  const pending = useRef<KitDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbs = useRef({ onSaved, onStatusChange, onDraftChange });
  useEffect(() => {
    cbs.current = { onSaved, onStatusChange, onDraftChange };
  });

  /* Load */
  useEffect(() => {
    if (!kitId) return;
    let cancelled = false;
    loaded.current = false;
    fetch(`/api/kits/${kitId}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "This kit doesn't exist or isn't yours." : "Couldn't load your kit. Refresh to try again.");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setDraft({
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
        });
        onLoaded?.({ id: data.id ?? kitId, name: data.name ?? "Untitled kit", slug: data.slug ?? "" });
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitId]);

  // Where the rate card's button can go: the Pro contact form, else the kit's links.
  useEffect(() => {
    setHasInquiryForm(isPro);
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => setHasLinks(Array.isArray(p?.links) && p.links.some((l: { url?: string }) => l?.url)))
      .catch(() => {});
  }, [isPro]);

  /* Save */
  const persist = useCallback(
    async (d: KitDraft) => {
      if (!kitId) return;
      if (inFlight.current) {
        pending.current = d;
        return;
      }
      inFlight.current = true;
      cbs.current.onStatusChange?.("saving");
      try {
        const res = await fetch(`/api/kits/${kitId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          // The rate card's visibility is controlled in the Rates section only.
          body: JSON.stringify({ ...d, sectionVisibility: { ...d.sectionVisibility, rates: d.rates.show } }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json().catch(() => ({}));
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
    registerRetry?.(() => draftRef.current && void persist(draftRef.current));
  }, [registerRetry, persist]);

  const update = <K extends keyof KitDraft>(key: K, value: KitDraft[K] | ((prev: KitDraft[K]) => KitDraft[K])) =>
    setDraft((d) => (d ? { ...d, [key]: typeof value === "function" ? (value as (p: KitDraft[K]) => KitDraft[K])(d[key]) : value } : d));

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

  const { rates, brands, sectionVisibility, appearance, manualStats } = draft;
  const ctaDestination = hasInquiryForm ? "your contact form" : hasLinks && sectionVisibility.links ? "your links" : null;

  const setRateItem = (id: string, patch: Partial<RateItem>) =>
    update("rates", (r) => ({ ...r, items: (r.items ?? []).map((it) => (it.id === id ? { ...it, ...patch } : it)) }));

  const visibility: Array<{ key: keyof SectionVisibility; label: string; starter?: boolean }> = [
    { key: "stats", label: "Reach & engagement", starter: true },
    { key: "growthChart", label: "Follower growth chart", starter: true },
    { key: "audience", label: "Audience demographics", starter: true },
    { key: "brands", label: "Brands I've worked with" },
    { key: "links", label: "Get in touch (your links)" },
  ];

  return (
    <div className="space-y-5">
      {/* Style */}
      <Section title="Style" hint="How your kit looks to brands. Your stats and rates stay the same in every style.">
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

      {/* Rates */}
      <Section
        title="Rates"
        hint="What you charge per deliverable. Brands decide faster when prices are on the kit."
        badge={<Switch checked={rates.show} onChange={(show) => update("rates", (r) => ({ ...r, show }))} label="Show rates on my kit" />}
      >
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
                  {ctaDestination ? `Takes brands to ${ctaDestination}.` : "Hidden until you add links in Settings or get the Pro contact form."}
                </p>
              </div>
            </div>
          </div>
        )}
      </Section>

      {/* Manual stats */}
      <Section
        title="Your numbers"
        hint="No platform connected? Add headline numbers; they show on your kit labelled as self-reported. On Starter and Pro, live data replaces them for any platform you connect."
        badge={<span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">All plans</span>}
      >
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
      </Section>

      {/* Brands */}
      <Section title="Brands you've worked with" hint="Past partners, for social proof. Add a logo URL to show the logo instead of the name.">
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

      {/* Visibility */}
      <Section title="What's on your kit" hint="Turn sections on or off. Rates are controlled in the Rates section above.">
        <ul className="divide-y divide-border">
          {visibility.map(({ key, label, starter }) => {
            const locked = isFree && !!starter;
            return (
              <li key={key} className="flex items-center justify-between gap-3 py-2.5">
                <span className={`text-sm ${locked ? "text-muted-foreground" : "text-foreground"}`}>{label}</span>
                <span className="flex items-center gap-2">
                  {locked && (
                    <Link href="/pricing?plan=starter" className="text-xs font-medium text-primary hover:underline">
                      Starter
                    </Link>
                  )}
                  <Switch
                    checked={!locked && sectionVisibility[key]}
                    disabled={locked}
                    onChange={(v) => update("sectionVisibility", (sv) => ({ ...sv, [key]: v }))}
                    label={label}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
