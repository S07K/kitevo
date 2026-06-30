"use client";

import { useState, useEffect } from "react";
import {
  MOCK_RATES,
  MOCK_BRANDS,
  type KitRates,
  type BrandPartner,
} from "@/lib/mock-data";
import {
  getKitContent,
  setKitContent,
  getAllKits,
  DEFAULT_SECTION_VISIBILITY,
  type SectionVisibility,
} from "@/lib/kit-storage";
import type { KitAppearance, KitAppearancePreset } from "@/lib/kit-appearance";
import {
  DEFAULT_KIT_APPEARANCE,
  KIT_APPEARANCE_PRESET_LABELS,
  BASIC_PRESETS,
  BRAND_KIT_VIBES,
  BRAND_KIT_VIBE_META,
  parseKitAppearance,
} from "@/lib/kit-appearance";
import { KitEditorSkeleton } from "@/app/components/Skeleton";

function newId(): string {
  return Math.random().toString(36).slice(2, 11);
}

interface KitEditorProps {
  kitId: string | null;
  tierId?: string | null;
  /** Called after a successful save with the kit's public slug */
  onSaved?: (slug: string) => void;
}

export function KitEditor({ kitId, tierId, onSaved }: KitEditorProps) {
  const isPro = tierId === "pro";
  const isStarter = tierId === "starter" || isPro;
  const isFree = !tierId || tierId === "free";
  const [effectiveKitId, setEffectiveKitId] = useState<string | null>(kitId);
  const [rates, setRates] = useState<KitRates>(MOCK_RATES);
  const [brands, setBrands] = useState<BrandPartner[]>(MOCK_BRANDS);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingKit, setLoadingKit] = useState(false);
  const [sectionVisibility, setSectionVisibility] = useState<SectionVisibility>(
    DEFAULT_SECTION_VISIBILITY
  );
  const [appearance, setAppearance] = useState<KitAppearance>(DEFAULT_KIT_APPEARANCE);

  // Resolve effective kit id (first kit if none specified)
  useEffect(() => {
    const id = kitId ?? getAllKits()[0]?.id ?? null;
    setEffectiveKitId(id);
  }, [kitId]);

  // Load kit content: from API when effectiveKitId is present, else localStorage
  useEffect(() => {
    setLoadError(null);
    if (!effectiveKitId) return;

    const isDbId = effectiveKitId.length >= 20 && !effectiveKitId.startsWith("kit_");
    if (isDbId) {
      setLoadingKit(true);
      fetch(`/api/kits/${effectiveKitId}`, { credentials: "include" })
        .then((r) => {
          if (!r.ok) throw new Error(r.status === 404 ? "Kit not found" : "Failed to load kit");
          return r.json();
        })
        .then((data) => {
          setRates(data.rates && typeof data.rates === "object" ? data.rates : MOCK_RATES);
          setBrands(Array.isArray(data.brands) ? data.brands : MOCK_BRANDS);
          setSectionVisibility(
            data.sectionVisibility && typeof data.sectionVisibility === "object"
              ? { ...DEFAULT_SECTION_VISIBILITY, ...data.sectionVisibility }
              : DEFAULT_SECTION_VISIBILITY
          );
          setAppearance(
            data.appearance && typeof data.appearance === "object"
              ? parseKitAppearance(typeof data.appearance === "string" ? data.appearance : JSON.stringify(data.appearance))
              : DEFAULT_KIT_APPEARANCE
          );
        })
        .catch((e) => setLoadError(e.message ?? "Failed to load kit"))
        .finally(() => setLoadingKit(false));
      return;
    }

    const stored = getKitContent(effectiveKitId);
    if (stored) {
      setRates(stored.rates);
      setBrands(stored.brands);
      setSectionVisibility(stored.sectionVisibility ?? DEFAULT_SECTION_VISIBILITY);
    }
  }, [effectiveKitId]);

  const save = () => {
    if (!effectiveKitId) return;
    const isDbId = effectiveKitId.length >= 20 && !effectiveKitId.startsWith("kit_");
    if (isDbId) {
      fetch(`/api/kits/${effectiveKitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rates, brands, sectionVisibility, appearance }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error("Failed to save");
          const data = await r.json().catch(() => ({}));
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          if (data.slug && onSaved) onSaved(data.slug);
        })
        .catch(() => setLoadError("Failed to save"));
      return;
    }
    setKitContent(effectiveKitId, { rates, brands, sectionVisibility });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addBrand = () => {
    setBrands((prev) => [...prev, { id: newId(), name: "", tagline: "" }]);
  };

  const updateBrand = (id: string, updates: Partial<BrandPartner>) => {
    setBrands((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  const removeBrand = (id: string) => {
    setBrands((prev) => prev.filter((b) => b.id !== id));
  };

  const updateSectionVisibility = (key: keyof SectionVisibility, value: boolean) => {
    setSectionVisibility((prev) => ({ ...prev, [key]: value }));
  };

  const visibilityToggles: { key: keyof SectionVisibility; label: string }[] = [
    { key: "stats", label: "Reach & engagement" },
    { key: "rates", label: "Rates" },
    { key: "brands", label: "Brands I've worked with" },
    { key: "growthChart", label: "Follower growth chart" },
    { key: "audience", label: "Audience demographics" },
    { key: "links", label: "Get in touch (links)" },
  ];

  if (!effectiveKitId) {
    return (
      <div className="p-8 border border-border rounded-2xl bg-background text-center">
        <p className="text-muted-foreground">No kit selected. Create one from the dashboard.</p>
        <a href="/dashboard" className="mt-4 inline-block text-sm font-medium text-foreground underline">
          Back to dashboard
        </a>
      </div>
    );
  }

  if (loadingKit) {
    return <KitEditorSkeleton />;
  }

  const isDbKit =
    effectiveKitId != null && effectiveKitId.length >= 20 && !effectiveKitId.startsWith("kit_");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Edit your kit
        </h2>
        <button
          type="button"
          onClick={save}
          className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-full hover:opacity-80 disabled:opacity-70"
        >
          {saved ? "✓ Saved" : "Save changes"}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-6">
        Save changes to refresh the live preview →
      </p>
      {loadError && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          <p className="font-medium">Something went wrong</p>
          <p className="mt-1">{loadError}</p>
          <button
            type="button"
            onClick={() => setLoadError(null)}
            className="mt-2 text-red-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section visibility — what appears on the public kit */}
      <div className="p-6 border border-border rounded-2xl bg-background">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
            Section visibility
          </h3>
          {isFree && (
            <span className="bg-foreground text-background rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide shrink-0">
              Starter
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which sections appear on your public media kit.
        </p>
        <div className="mt-4 space-y-2.5">
          {visibilityToggles.map(({ key, label }) => {
            const starterOnly = ["stats", "growthChart", "audience"].includes(key);
            const locked = isFree && starterOnly;
            return (
              <div key={key} className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={!locked && sectionVisibility[key]}
                  disabled={locked}
                  onClick={() => !locked && updateSectionVisibility(key, !sectionVisibility[key])}
                  className={`flex items-center gap-3 flex-1 text-left ${locked ? "opacity-40 cursor-not-allowed" : "group"}`}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded flex items-center justify-center transition-colors"
                    style={locked ? { border: "1.5px solid #999" } : {
                      border: sectionVisibility[key] ? undefined : "1.5px solid #999",
                      backgroundColor: sectionVisibility[key] ? "var(--color-foreground)" : undefined,
                      color: sectionVisibility[key] ? "var(--color-background)" : undefined,
                      outline: sectionVisibility[key] ? "1.5px solid var(--color-foreground)" : undefined,
                    }}
                  >
                    {!locked && sectionVisibility[key] && (
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1.5 5 3.8 7.5 8.5 2" />
                      </svg>
                    )}
                  </span>
                  <span className="text-sm text-foreground">{label}</span>
                </button>
                {locked && (
                  <a href="/pricing" className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    Upgrade →
                  </a>
                )}
              </div>
            );
          })}
        </div>
        {isFree && (
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Unlock live stats, growth charts & audience sections</p>
            <a href="/pricing" className="shrink-0 bg-foreground text-background rounded-full px-4 py-1.5 text-xs font-medium hover:opacity-80 transition-opacity">
              Upgrade to Starter →
            </a>
          </div>
        )}
      </div>

      {isDbKit && (
        <div className="border-border bg-background space-y-8 rounded-2xl border p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-foreground text-base font-semibold tracking-tight">
                Brand Kit
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Choose a visual identity for your public kit.
              </p>
            </div>
            {appearance.preset && (
              <span className="text-muted-foreground bg-muted shrink-0 rounded-full px-3 py-1 text-xs font-medium">
                {KIT_APPEARANCE_PRESET_LABELS[appearance.preset]}
              </span>
            )}
          </div>

          {/* ── Basic presets (all plans) ── */}
          <div>
            <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
              Starter styles
            </p>
            <div className="flex flex-wrap gap-2">
              {BASIC_PRESETS.map((preset) => {
                const active = appearance.preset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAppearance((a) => ({ ...a, preset }))}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-all duration-150 ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-foreground hover:bg-muted hover:border-foreground/20"
                    }`}
                  >
                    {KIT_APPEARANCE_PRESET_LABELS[preset]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Brand Kit Vibes (Pro) ── */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
                Brand Kit Vibes
              </p>
              {!isPro && (
                <span className="bg-foreground text-background rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                  Pro
                </span>
              )}
            </div>

            {!isPro ? (
              <div className="relative">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 opacity-40 pointer-events-none select-none">
                  {BRAND_KIT_VIBES.slice(0, 4).map((vibe) => {
                    const meta = BRAND_KIT_VIBE_META[vibe];
                    return (
                      <div key={vibe} className="flex items-stretch rounded-xl border border-border overflow-hidden">
                        <div className="w-1.5 shrink-0" style={{ backgroundColor: meta.bg === "#111110" || meta.bg === "#0A0A14" ? meta.fg : meta.bg }} />
                        <div className="flex-1 px-4 py-3.5">
                          <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{meta.tagline}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-background/85 backdrop-blur-sm text-center px-6 py-8">
                  <p className="text-foreground text-sm font-semibold">5 signature design styles</p>
                  <p className="text-muted-foreground mt-1 text-xs max-w-[220px] leading-relaxed">
                    Editorial, Studio, Bloom, Electric, Noir Pro — with custom accent colors.
                  </p>
                  <a
                    href="/pricing"
                    className="bg-foreground text-background mt-4 inline-flex h-8 items-center rounded-full px-5 text-xs font-medium transition-opacity hover:opacity-80"
                  >
                    Upgrade to Pro →
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {BRAND_KIT_VIBES.map((vibe) => {
                  const meta = BRAND_KIT_VIBE_META[vibe];
                  const active = appearance.preset === vibe;
                  const accentColor = meta.bg === "#111110" || meta.bg === "#0A0A14" ? meta.fg : meta.bg;
                  return (
                    <button
                      key={vibe}
                      type="button"
                      onClick={() => setAppearance((a) => ({ ...a, preset: vibe }))}
                      className={`flex items-stretch rounded-xl border text-left transition-all duration-150 overflow-hidden ${
                        active
                          ? "border-foreground bg-muted/40"
                          : "border-border hover:border-foreground/20 hover:bg-muted/30"
                      }`}
                    >
                      {/* Color accent bar */}
                      <div className="w-1.5 shrink-0" style={{ backgroundColor: accentColor }} />
                      {/* Content */}
                      <div className="flex-1 px-4 py-3.5 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground leading-snug">{meta.label}</p>
                          {active && (
                            <span className="shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background mt-0.5">
                              <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="1.5 5 3.8 7.5 8.5 2" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{meta.tagline}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-2 tracking-wide">{meta.for}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Logo URL (Pro) ── */}
          {isPro && (
            <div>
              <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.16em] uppercase">
                Brand logo
              </p>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={appearance.logoUrl ?? ""}
                onChange={(e) =>
                  setAppearance((a) => ({
                    ...a,
                    logoUrl: e.target.value || undefined,
                  }))
                }
                className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-muted-foreground mt-1.5 text-xs">
                Shown in your kit header instead of the Kitevo wordmark.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Rates */}
      <div className="p-6 border border-border rounded-2xl bg-background">
        <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
          Rates
        </h3>
        <div className="mt-4 space-y-4">
          <button
            type="button"
            role="checkbox"
            aria-checked={rates.show}
            onClick={() => setRates((r) => ({ ...r, show: !r.show }))}
            className="flex items-center gap-3 text-left group"
          >
            <span
              className="h-4 w-4 shrink-0 rounded flex items-center justify-center transition-colors"
              style={{
                border: rates.show ? undefined : "1.5px solid #999",
                backgroundColor: rates.show ? "var(--color-foreground)" : undefined,
                color: rates.show ? "var(--color-background)" : undefined,
                outline: rates.show ? "1.5px solid var(--color-foreground)" : undefined,
              }}
            >
              {rates.show && (
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1.5 5 3.8 7.5 8.5 2" />
                </svg>
              )}
            </span>
            <span className="text-sm text-foreground">Show rates on my kit</span>
          </button>
          {rates.show && (
            <>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  From amount ($)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="2500"
                  value={rates.fromAmount ?? ""}
                  onChange={(e) =>
                    setRates((r) => ({
                      ...r,
                      fromAmount: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full max-w-xs px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Leave empty for &quot;Contact for rates&quot;
                </p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Button label
                </label>
                <input
                  type="text"
                  placeholder="Get in touch"
                  value={rates.ctaLabel ?? ""}
                  onChange={(e) =>
                    setRates((r) => ({ ...r, ctaLabel: e.target.value || undefined }))
                  }
                  className="w-full max-w-xs px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Brands */}
      <div className="p-6 border border-border rounded-2xl bg-background">
        <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">
          Brands I&apos;ve worked with
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add past partners for social proof.
        </p>
        <div className="mt-4 space-y-4">
          {brands.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-2xl border border-border flex gap-3 flex-wrap"
            >
              <input
                type="text"
                placeholder="Brand name"
                value={b.name}
                onChange={(e) => updateBrand(b.id, { name: e.target.value })}
                className="flex-1 min-w-[120px] px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="text"
                placeholder="Tagline (e.g. Spring campaign • 2024)"
                value={b.tagline ?? ""}
                onChange={(e) => updateBrand(b.id, { tagline: e.target.value })}
                className="flex-1 min-w-[120px] px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => removeBrand(b.id)}
                className="text-xs text-red-600 hover:underline self-center"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addBrand}
            className="w-full py-3 border border-dashed border-border rounded-2xl text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
          >
            + Add brand
          </button>
        </div>
      </div>
    </div>
  );
}
