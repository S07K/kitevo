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
}

export function KitEditor({ kitId }: KitEditorProps) {
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
        body: JSON.stringify({ workSamples, rates, brands, sectionVisibility }),
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
