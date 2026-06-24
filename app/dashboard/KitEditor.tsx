"use client";

import { useState, useEffect } from "react";
import {
  MOCK_WORK_SAMPLES,
  MOCK_RATES,
  MOCK_BRANDS,
  type WorkSample,
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
import type { FetchedPost } from "@/lib/platforms";
import { KitEditorSkeleton } from "@/app/components/Skeleton";

const PLATFORMS: { value: WorkSample["platform"]; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
];

function newId(): string {
  return Math.random().toString(36).slice(2, 11);
}

interface KitEditorProps {
  /** Kit to edit. If null, uses first kit from storage (backward compat). */
  kitId: string | null;
  /** Subscription tier id — controls Pro feature gating. */
  tierId?: string | null;
}

export function KitEditor({ kitId, tierId }: KitEditorProps) {
  const isPro = tierId === "pro";
  const [effectiveKitId, setEffectiveKitId] = useState<string | null>(kitId);
  const [workSamples, setWorkSamples] = useState<WorkSample[]>(MOCK_WORK_SAMPLES);
  const [rates, setRates] = useState<KitRates>(MOCK_RATES);
  const [brands, setBrands] = useState<BrandPartner[]>(MOCK_BRANDS);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingKit, setLoadingKit] = useState(false);
  const [fetchedPosts, setFetchedPosts] = useState<FetchedPost[] | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);
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
          setWorkSamples(Array.isArray(data.workSamples) ? data.workSamples : MOCK_WORK_SAMPLES);
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
      setWorkSamples(stored.workSamples);
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
        body: JSON.stringify({ workSamples, rates, brands, sectionVisibility, appearance }),
      })
        .then((r) => {
          if (!r.ok) throw new Error("Failed to save");
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        })
        .catch(() => setLoadError("Failed to save"));
      return;
    }
    setKitContent(effectiveKitId, { workSamples, rates, brands, sectionVisibility });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addWorkSample = () => {
    setWorkSamples((prev) => [
      ...prev,
      { id: newId(), platform: "instagram", title: "", caption: "", campaignFor: "" },
    ]);
  };

  const updateWorkSample = (id: string, updates: Partial<WorkSample>) => {
    setWorkSamples((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const removeWorkSample = (id: string) => {
    setWorkSamples((prev) => prev.filter((s) => s.id !== id));
  };

  const loadInstagramPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch("/api/instagram/recent-posts", { credentials: "include" });
      const posts = res.ok ? (await res.json()) : [];
      setFetchedPosts(Array.isArray(posts) ? posts : []);
    } finally {
      setLoadingPosts(false);
    }
  };

  const isPostInKit = (mediaId: string) =>
    workSamples.some((s) => s.sourceMediaId === mediaId);

  const addPostToKit = (post: FetchedPost) => {
    if (isPostInKit(post.id)) return;
    setWorkSamples((prev) => [
      ...prev,
      {
        id: newId(),
        platform: post.platform,
        thumbnailUrl: post.thumbnailUrl,
        caption: post.caption ?? undefined,
        title: post.caption?.slice(0, 50) ?? undefined,
        sourceMediaId: post.id,
      },
    ]);
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
    { key: "workSamples", label: "Work samples" },
    { key: "rates", label: "Rates" },
    { key: "brands", label: "Brands I've worked with" },
    { key: "growthChart", label: "Follower growth chart" },
    { key: "audience", label: "Audience demographics" },
    { key: "links", label: "Get in touch (links)" },
  ];

  if (!effectiveKitId) {
    return (
      <div className="p-8 border border-[#E8E6E3] rounded-lg bg-white text-center">
        <p className="text-[#5C5C5C]">No kit selected. Create one from the dashboard.</p>
        <a href="/dashboard" className="mt-4 inline-block text-sm font-medium text-[#1A1A1A] underline">
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
        <h2 className="font-display text-xl font-semibold text-[#1A1A1A]">
          Edit your kit
        </h2>
        <button
          type="button"
          onClick={save}
          className="px-4 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-sm hover:bg-[#2D2D2D] disabled:opacity-70"
        >
          {saved ? "Saved" : "Save changes"}
        </button>
      </div>
      {loadError && (
        <div className="rounded-sm bg-red-50 border border-red-200 p-4 text-sm text-red-800">
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
      <div className="p-6 border border-[#E8E6E3] rounded-lg bg-white">
        <h3 className="text-sm uppercase tracking-wider text-[#8C8C8C] font-medium">
          Section visibility
        </h3>
        <p className="mt-1 text-sm text-[#5C5C5C]">
          Choose which sections appear on your public media kit.
        </p>
        <div className="mt-4 space-y-3">
          {visibilityToggles.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={sectionVisibility[key]}
                onChange={(e) => updateSectionVisibility(key, e.target.checked)}
                className="rounded border-[#D4D4D4] text-[#1A1A1A] focus:ring-[#1A1A1A]"
              />
              <span className="text-sm text-[#1A1A1A]">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {isDbKit && (
        <div className="border-border bg-background space-y-8 rounded-2xl border p-6">
          <div>
            <h3 className="text-foreground text-base font-semibold tracking-tight">
              Brand Kit
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Choose a visual style for your public kit. Saves with <strong>Save changes</strong>.
            </p>
          </div>

          {/* ── Basic presets (all plans) ── */}
          <div>
            <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
              Basic styles
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BASIC_PRESETS.map((preset) => {
                const active = appearance.preset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAppearance((a) => ({ ...a, preset }))}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-foreground hover:bg-muted"
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
            <div className="mb-3 flex items-center gap-2">
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
              <div className="border-border rounded-2xl border border-dashed p-6 text-center">
                <p className="text-foreground text-sm font-semibold">5 signature design styles</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Editorial, Studio, Bloom, Electric, Noir Pro — each with custom accent colors and font pairings.
                </p>
                <a
                  href="/pricing"
                  className="bg-foreground text-background mt-4 inline-flex h-9 items-center rounded-full px-5 text-sm font-medium transition-opacity hover:opacity-80"
                >
                  Upgrade to Pro
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {BRAND_KIT_VIBES.map((vibe) => {
                  const meta = BRAND_KIT_VIBE_META[vibe];
                  const active = appearance.preset === vibe;
                  return (
                    <button
                      key={vibe}
                      type="button"
                      onClick={() => setAppearance((a) => ({ ...a, preset: vibe }))}
                      className={`relative overflow-hidden rounded-2xl border text-left transition-all ${
                        active ? "ring-2 ring-foreground ring-offset-2" : "border-border hover:border-foreground/30"
                      }`}
                    >
                      {/* Color preview strip */}
                      <div
                        className="h-14 w-full"
                        style={{ backgroundColor: meta.bg }}
                      >
                        <div className="flex h-full items-end px-4 pb-3">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                            style={{ backgroundColor: meta.fg, color: meta.bg }}
                          >
                            {meta.label}
                          </span>
                        </div>
                      </div>
                      <div className="bg-background border-border border-t p-3">
                        <p className="text-foreground text-xs font-semibold">{meta.label}</p>
                        <p className="text-muted-foreground mt-0.5 text-[11px]">{meta.for}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Accent color (Pro) ── */}
          {isPro && (
            <div>
              <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
                Accent color override
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "#111110", "#f5f0e8", "#c9a84c", "#6366f1",
                  "#c97b4b", "#2d9b8a", "#e14d6e", "#3b82f6",
                ].map((color) => {
                  const active = appearance.accentColor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      onClick={() =>
                        setAppearance((a) => ({
                          ...a,
                          accentColor: active ? undefined : color,
                        }))
                      }
                      className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        active ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  );
                })}
                <button
                  type="button"
                  title="Clear accent override"
                  onClick={() => setAppearance((a) => ({ ...a, accentColor: undefined }))}
                  className="border-border text-muted-foreground hover:text-foreground h-8 rounded-full border px-3 text-[11px] font-medium transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* ── Logo URL (Pro) ── */}
          {isPro && (
            <div>
              <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
                Brand logo URL
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
                Displayed in your kit header instead of the Media Kit Pro wordmark.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Work samples */}
      <div className="p-6 border border-[#E8E6E3] rounded-lg bg-white">
        <h3 className="text-sm uppercase tracking-wider text-[#8C8C8C] font-medium">
          Work samples
        </h3>
        <p className="mt-1 text-sm text-[#5C5C5C]">
          Add posts or videos you want brands to see.
        </p>

        {/* Select from Instagram */}
        <div className="mt-6 pt-6 border-t border-[#E8E6E3]">
          <p className="text-sm font-medium text-[#1A1A1A]">
            Select from your Instagram posts
          </p>
          <p className="mt-0.5 text-xs text-[#8C8C8C]">
            We&apos;ll fetch your recent posts so you can pick which to feature.
          </p>
          {fetchedPosts === null ? (
            <button
              type="button"
              onClick={loadInstagramPosts}
              disabled={loadingPosts}
              className="mt-3 px-4 py-2 border border-[#1A1A1A] text-[#1A1A1A] text-sm font-medium rounded-sm hover:bg-[#F5F5F5] disabled:opacity-60"
            >
              {loadingPosts ? "Loading…" : "Load Instagram posts"}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={loadInstagramPosts}
                disabled={loadingPosts}
                className="mt-3 text-xs text-[#5C5C5C] hover:underline disabled:opacity-60"
              >
                {loadingPosts ? "Refreshing…" : "Refresh"}
              </button>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {fetchedPosts.map((post) => {
                  const inKit = isPostInKit(post.id);
                  return (
                    <div
                      key={post.id}
                      className="rounded-lg border border-[#E8E6E3] overflow-hidden bg-[#FAFAFA]"
                    >
                      <div className="aspect-square relative bg-[#E8E6E3]">
                        <img
                          src={post.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {inKit && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-[#1A1A1A] text-white text-[10px] font-medium rounded">
                            In kit
                          </span>
                        )}
                      </div>
                      <p className="p-2 text-xs text-[#5C5C5C] line-clamp-2">
                        {post.caption || "No caption"}
                      </p>
                      {!inKit && (
                        <button
                          type="button"
                          onClick={() => addPostToKit(post)}
                          className="w-full py-1.5 text-xs font-medium text-[#1A1A1A] border-t border-[#E8E6E3] hover:bg-[#F0F0F0]"
                        >
                          Add to kit
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-xs text-[#8C8C8C]">
          Or add an entry manually below.
        </p>
        <div className="mt-4 space-y-4">
          {workSamples.map((s) => (
            <div
              key={s.id}
              className="p-4 rounded-lg border border-[#E8E6E3] space-y-3"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs text-[#8C8C8C]">{s.platform}</span>
                <button
                  type="button"
                  onClick={() => removeWorkSample(s.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
              <input
                type="text"
                placeholder="Title (e.g. Spring collection launch)"
                value={s.title ?? ""}
                onChange={(e) => updateWorkSample(s.id, { title: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
              />
              <select
                value={s.platform}
                onChange={(e) =>
                  updateWorkSample(s.id, {
                    platform: e.target.value as WorkSample["platform"],
                  })
                }
                className="w-full px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Campaign for (e.g. Fashion Co)"
                value={s.campaignFor ?? ""}
                onChange={(e) =>
                  updateWorkSample(s.id, { campaignFor: e.target.value })
                }
                className="w-full px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
              />
              <input
                type="text"
                placeholder="Caption (e.g. Reel • 2.1M views)"
                value={s.caption ?? ""}
                onChange={(e) => updateWorkSample(s.id, { caption: e.target.value })}
                className="w-full px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
              />
              <input
                type="url"
                placeholder="Thumbnail image URL (optional)"
                value={s.thumbnailUrl ?? ""}
                onChange={(e) =>
                  updateWorkSample(s.id, { thumbnailUrl: e.target.value || undefined })
                }
                className="w-full px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addWorkSample}
            className="w-full py-3 border border-dashed border-[#D4D4D4] rounded-lg text-sm text-[#5C5C5C] hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
          >
            + Add work sample
          </button>
        </div>
      </div>

      {/* Rates */}
      <div className="p-6 border border-[#E8E6E3] rounded-lg bg-white">
        <h3 className="text-sm uppercase tracking-wider text-[#8C8C8C] font-medium">
          Rates
        </h3>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rates.show}
              onChange={(e) => setRates((r) => ({ ...r, show: e.target.checked }))}
            />
            <span className="text-sm">Show rates on my kit</span>
          </label>
          {rates.show && (
            <>
              <div>
                <label className="block text-xs text-[#8C8C8C] mb-1">
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
                  className="w-full max-w-xs px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
                />
                <p className="mt-1 text-xs text-[#8C8C8C]">
                  Leave empty for &quot;Contact for rates&quot;
                </p>
              </div>
              <div>
                <label className="block text-xs text-[#8C8C8C] mb-1">
                  Button label
                </label>
                <input
                  type="text"
                  placeholder="Get in touch"
                  value={rates.ctaLabel ?? ""}
                  onChange={(e) =>
                    setRates((r) => ({ ...r, ctaLabel: e.target.value || undefined }))
                  }
                  className="w-full max-w-xs px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Brands */}
      <div className="p-6 border border-[#E8E6E3] rounded-lg bg-white">
        <h3 className="text-sm uppercase tracking-wider text-[#8C8C8C] font-medium">
          Brands I&apos;ve worked with
        </h3>
        <p className="mt-1 text-sm text-[#5C5C5C]">
          Add past partners for social proof.
        </p>
        <div className="mt-4 space-y-4">
          {brands.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-lg border border-[#E8E6E3] flex gap-3 flex-wrap"
            >
              <input
                type="text"
                placeholder="Brand name"
                value={b.name}
                onChange={(e) => updateBrand(b.id, { name: e.target.value })}
                className="flex-1 min-w-[120px] px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
              />
              <input
                type="text"
                placeholder="Tagline (e.g. Spring campaign • 2024)"
                value={b.tagline ?? ""}
                onChange={(e) => updateBrand(b.id, { tagline: e.target.value })}
                className="flex-1 min-w-[120px] px-3 py-2 border border-[#E8E6E3] rounded-sm text-sm"
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
            className="w-full py-3 border border-dashed border-[#D4D4D4] rounded-lg text-sm text-[#5C5C5C] hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
          >
            + Add brand
          </button>
        </div>
      </div>
    </div>
  );
}
