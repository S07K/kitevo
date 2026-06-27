"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  DEFAULT_SECTION_ORDER,
  type SectionVisibility,
  type SectionKey,
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

const SECTION_LABELS: Record<SectionKey, string> = {
  stats: "Reach & engagement",
  workSamples: "Work samples",
  rates: "Rates",
  brands: "Brands I've worked with",
  growthChart: "Follower growth chart",
  audience: "Audience demographics",
  links: "Get in touch (links)",
};

function newId(): string {
  return Math.random().toString(36).slice(2, 11);
}

// ── Drag handle icon ──────────────────────────────────────────────────────────

function GripIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <circle cx="4.5" cy="3" r="1.2" />
      <circle cx="9.5" cy="3" r="1.2" />
      <circle cx="4.5" cy="7" r="1.2" />
      <circle cx="9.5" cy="7" r="1.2" />
      <circle cx="4.5" cy="11" r="1.2" />
      <circle cx="9.5" cy="11" r="1.2" />
    </svg>
  );
}

// ── Sortable work-sample card ─────────────────────────────────────────────────

interface SortableWorkSampleProps {
  sample: WorkSample;
  onUpdate: (id: string, updates: Partial<WorkSample>) => void;
  onRemove: (id: string) => void;
}

function SortableWorkSample({ sample: s, onUpdate, onRemove }: SortableWorkSampleProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: s.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-4 rounded-2xl border border-border space-y-3 bg-background"
    >
      <div className="flex justify-between items-center">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 -ml-1 rounded touch-none"
          aria-label="Drag to reorder"
        >
          <GripIcon />
        </button>
        <span className="text-xs text-muted-foreground flex-1 ml-2">{s.platform}</span>
        <button
          type="button"
          onClick={() => onRemove(s.id)}
          className="text-xs text-red-600 hover:underline"
        >
          Remove
        </button>
      </div>
      <input
        type="text"
        placeholder="Title (e.g. Spring collection launch)"
        value={s.title ?? ""}
        onChange={(e) => onUpdate(s.id, { title: e.target.value })}
        className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <select
        value={s.platform}
        onChange={(e) => onUpdate(s.id, { platform: e.target.value as WorkSample["platform"] })}
        className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {PLATFORMS.map((p) => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Brand (e.g. Fashion Co)"
          value={s.campaignFor ?? ""}
          onChange={(e) => onUpdate(s.id, { campaignFor: e.target.value })}
          className="px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="text"
          placeholder="Type (e.g. Reel)"
          value={s.contentType ?? ""}
          onChange={(e) => onUpdate(s.id, { contentType: e.target.value || undefined })}
          className="px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Metrics</p>
      <div className="grid grid-cols-2 gap-2">
        <input type="number" placeholder="Views" value={s.views ?? ""}
          onChange={(e) => onUpdate(s.id, { views: e.target.value ? Number(e.target.value) : undefined })}
          className="px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        <input type="number" placeholder="Reach" value={s.reach ?? ""}
          onChange={(e) => onUpdate(s.id, { reach: e.target.value ? Number(e.target.value) : undefined })}
          className="px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        <input type="number" placeholder="Likes" value={s.likes ?? ""}
          onChange={(e) => onUpdate(s.id, { likes: e.target.value ? Number(e.target.value) : undefined })}
          className="px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        <input type="number" placeholder="Comments" value={s.comments ?? ""}
          onChange={(e) => onUpdate(s.id, { comments: e.target.value ? Number(e.target.value) : undefined })}
          className="px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        <input type="number" placeholder="Saves" value={s.saves ?? ""}
          onChange={(e) => onUpdate(s.id, { saves: e.target.value ? Number(e.target.value) : undefined })}
          className="col-span-2 px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <input
        type="url"
        placeholder="Thumbnail image URL (optional)"
        value={s.thumbnailUrl ?? ""}
        onChange={(e) => onUpdate(s.id, { thumbnailUrl: e.target.value || undefined })}
        className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

// ── Sortable brand row ────────────────────────────────────────────────────────

interface SortableBrandProps {
  brand: BrandPartner;
  onUpdate: (id: string, updates: Partial<BrandPartner>) => void;
  onRemove: (id: string) => void;
}

function SortableBrand({ brand: b, onUpdate, onRemove }: SortableBrandProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: b.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-4 rounded-2xl border border-border flex gap-3 flex-wrap items-center bg-background"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded shrink-0 touch-none"
        aria-label="Drag to reorder"
      >
        <GripIcon />
      </button>
      <input
        type="text"
        placeholder="Brand name"
        value={b.name}
        onChange={(e) => onUpdate(b.id, { name: e.target.value })}
        className="flex-1 min-w-[120px] px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        type="text"
        placeholder="Tagline (e.g. Spring campaign • 2024)"
        value={b.tagline ?? ""}
        onChange={(e) => onUpdate(b.id, { tagline: e.target.value })}
        className="flex-1 min-w-[120px] px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="button"
        onClick={() => onRemove(b.id)}
        className="text-xs text-red-600 hover:underline self-center shrink-0"
      >
        Remove
      </button>
    </div>
  );
}

// ── Sortable section toggle row ───────────────────────────────────────────────

interface SortableSectionRowProps {
  sectionKey: SectionKey;
  visible: boolean;
  onToggle: (key: SectionKey, value: boolean) => void;
}

function SortableSectionRow({ sectionKey, visible, onToggle }: SortableSectionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sectionKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded shrink-0 touch-none"
        aria-label="Drag to reorder section"
      >
        <GripIcon />
      </button>
      <button
        type="button"
        role="checkbox"
        aria-checked={visible}
        onClick={() => onToggle(sectionKey, !visible)}
        className="flex items-center gap-3 text-left flex-1"
      >
        <span
          className="h-4 w-4 shrink-0 rounded flex items-center justify-center transition-colors"
          style={{
            border: visible ? undefined : "1.5px solid #999",
            backgroundColor: visible ? "var(--color-foreground)" : undefined,
            color: visible ? "var(--color-background)" : undefined,
            outline: visible ? "1.5px solid var(--color-foreground)" : undefined,
          }}
        >
          {visible && (
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1.5 5 3.8 7.5 8.5 2" />
            </svg>
          )}
        </span>
        <span className="text-sm text-foreground">{SECTION_LABELS[sectionKey]}</span>
      </button>
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

interface KitEditorProps {
  kitId: string | null;
  tierId?: string | null;
  onSaved?: (slug: string) => void;
}

export function KitEditor({ kitId, tierId, onSaved }: KitEditorProps) {
  const isPro = tierId === "pro";
  const [effectiveKitId, setEffectiveKitId] = useState<string | null>(kitId);
  const [workSamples, setWorkSamples] = useState<WorkSample[]>(MOCK_WORK_SAMPLES);
  const [rates, setRates] = useState<KitRates>(MOCK_RATES);
  const [brands, setBrands] = useState<BrandPartner[]>(MOCK_BRANDS);
  const [sectionVisibility, setSectionVisibility] = useState<SectionVisibility>(DEFAULT_SECTION_VISIBILITY);
  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>([...DEFAULT_SECTION_ORDER]);
  const [appearance, setAppearance] = useState<KitAppearance>(DEFAULT_KIT_APPEARANCE);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingKit, setLoadingKit] = useState(false);
  const [fetchedPosts, setFetchedPosts] = useState<FetchedPost[] | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Debounced auto-save ref
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = kitId ?? getAllKits()[0]?.id ?? null;
    setEffectiveKitId(id);
  }, [kitId]);

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
          setSectionOrder(
            Array.isArray(data.sectionOrder) && data.sectionOrder.length > 0
              ? data.sectionOrder
              : [...DEFAULT_SECTION_ORDER]
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

  const save = useCallback((overrides?: {
    workSamples?: WorkSample[];
    brands?: BrandPartner[];
    sectionOrder?: SectionKey[];
  }) => {
    if (!effectiveKitId) return;
    const isDbId = effectiveKitId.length >= 20 && !effectiveKitId.startsWith("kit_");
    const payload = {
      workSamples: overrides?.workSamples ?? workSamples,
      rates,
      brands: overrides?.brands ?? brands,
      sectionVisibility,
      sectionOrder: overrides?.sectionOrder ?? sectionOrder,
      appearance,
    };
    if (isDbId) {
      fetch(`/api/kits/${effectiveKitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
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
    setKitContent(effectiveKitId, { workSamples: payload.workSamples, rates: payload.rates, brands: payload.brands, sectionVisibility: payload.sectionVisibility });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [effectiveKitId, workSamples, rates, brands, sectionVisibility, sectionOrder, appearance, onSaved]);

  // Trigger debounced save after drag reorder
  const scheduleSave = useCallback((overrides: Parameters<typeof save>[0]) => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(overrides), 800);
  }, [save]);

  // ── Drag end handlers ──

  const handleWorkSampleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setWorkSamples((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);
      scheduleSave({ workSamples: reordered });
      return reordered;
    });
  };

  const handleBrandDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBrands((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);
      scheduleSave({ brands: reordered });
      return reordered;
    });
  };

  const handleSectionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSectionOrder((items) => {
      const oldIndex = items.indexOf(active.id as SectionKey);
      const newIndex = items.indexOf(over.id as SectionKey);
      const reordered = arrayMove(items, oldIndex, newIndex);
      scheduleSave({ sectionOrder: reordered });
      return reordered;
    });
  };

  // ── CRUD helpers ──

  const addWorkSample = () => {
    setWorkSamples((prev) => [
      ...prev,
      { id: newId(), platform: "instagram", title: "", caption: "", campaignFor: "" },
    ]);
  };

  const updateWorkSample = (id: string, updates: Partial<WorkSample>) => {
    setWorkSamples((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeWorkSample = (id: string) => {
    setWorkSamples((prev) => prev.filter((s) => s.id !== id));
  };

  const loadInstagramPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch("/api/instagram/media", { credentials: "include" });
      const posts = res.ok ? (await res.json()) : [];
      setFetchedPosts(Array.isArray(posts) ? posts : []);
    } finally {
      setLoadingPosts(false);
    }
  };

  const isPostInKit = (mediaId: string) => workSamples.some((s) => s.sourceMediaId === mediaId);

  const addPostToKit = (post: FetchedPost) => {
    if (isPostInKit(post.id)) return;
    const contentType =
      post.mediaType === "VIDEO" ? "Reel" :
      post.mediaType === "CAROUSEL_ALBUM" ? "Carousel" :
      post.mediaType === "IMAGE" ? "Photo" : undefined;
    setWorkSamples((prev) => [
      ...prev,
      {
        id: newId(),
        platform: post.platform,
        thumbnailUrl: post.thumbnailUrl || undefined,
        title: post.caption?.slice(0, 60).replace(/\s+#\S+/g, "").trim() || "Post",
        sourceMediaId: post.id,
        contentType,
        likes: post.likes,
        comments: post.comments,
        saves: post.saves,
        views: post.views,
        reach: post.reach,
      },
    ]);
  };

  const addBrand = () => setBrands((prev) => [...prev, { id: newId(), name: "", tagline: "" }]);
  const updateBrand = (id: string, updates: Partial<BrandPartner>) => setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  const removeBrand = (id: string) => setBrands((prev) => prev.filter((b) => b.id !== id));

  const updateSectionVisibility = (key: SectionKey, value: boolean) => {
    setSectionVisibility((prev) => ({ ...prev, [key]: value }));
  };

  // ── Render guards ──

  if (!effectiveKitId) {
    return (
      <div className="p-8 border border-border rounded-2xl bg-background text-center">
        <p className="text-muted-foreground">No kit selected. Create one from the dashboard.</p>
        <a href="/dashboard" className="mt-4 inline-block text-sm font-medium text-foreground underline">Back to dashboard</a>
      </div>
    );
  }

  if (loadingKit) return <KitEditorSkeleton />;

  const isDbKit = effectiveKitId != null && effectiveKitId.length >= 20 && !effectiveKitId.startsWith("kit_");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">Edit your kit</h2>
        <button
          type="button"
          onClick={() => save()}
          className="px-4 py-2 bg-foreground text-background text-sm font-medium rounded-full hover:opacity-80 disabled:opacity-70"
        >
          {saved ? "✓ Saved" : "Save changes"}
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-6">Save changes to refresh the live preview →</p>

      {loadError && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          <p className="font-medium">Something went wrong</p>
          <p className="mt-1">{loadError}</p>
          <button type="button" onClick={() => setLoadError(null)} className="mt-2 text-red-600 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Section visibility + order */}
      <div className="p-6 border border-border rounded-2xl bg-background">
        <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Section visibility</h3>
        <p className="mt-1 text-sm text-muted-foreground">Toggle and drag to control which sections appear and in what order.</p>
        <div className="mt-4 space-y-2.5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
              {sectionOrder.map((key) => (
                <SortableSectionRow
                  key={key}
                  sectionKey={key}
                  visible={sectionVisibility[key]}
                  onToggle={updateSectionVisibility}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Brand Kit appearance (DB kits only) */}
      {isDbKit && (
        <div className="border-border bg-background space-y-8 rounded-2xl border p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-foreground text-base font-semibold tracking-tight">Brand Kit</h3>
              <p className="text-muted-foreground mt-1 text-sm">Choose a visual identity for your public kit.</p>
            </div>
            {appearance.preset && (
              <span className="text-muted-foreground bg-muted shrink-0 rounded-full px-3 py-1 text-xs font-medium">
                {KIT_APPEARANCE_PRESET_LABELS[appearance.preset]}
              </span>
            )}
          </div>

          <div>
            <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-[0.16em] uppercase">Starter styles</p>
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

          <div>
            <div className="mb-4 flex items-center gap-2">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">Brand Kit Vibes</p>
              {!isPro && (
                <span className="bg-foreground text-background rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide">Pro</span>
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
                  <a href="/pricing" className="bg-foreground text-background mt-4 inline-flex h-8 items-center rounded-full px-5 text-xs font-medium transition-opacity hover:opacity-80">
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
                        active ? "border-foreground bg-muted/40" : "border-border hover:border-foreground/20 hover:bg-muted/30"
                      }`}
                    >
                      <div className="w-1.5 shrink-0" style={{ backgroundColor: accentColor }} />
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

          {isPro && (
            <div>
              <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[0.16em] uppercase">Brand logo</p>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={appearance.logoUrl ?? ""}
                onChange={(e) => setAppearance((a) => ({ ...a, logoUrl: e.target.value || undefined }))}
                className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-muted-foreground mt-1.5 text-xs">Shown in your kit header instead of the Kitevo wordmark.</p>
            </div>
          )}
        </div>
      )}

      {/* Work samples */}
      <div className="p-6 border border-border rounded-2xl bg-background">
        <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Work samples</h3>
        <p className="mt-1 text-sm text-muted-foreground">Add posts or videos you want brands to see.</p>

        {/* Select from Instagram */}
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-sm font-medium text-foreground">Select from your Instagram posts</p>
          <p className="mt-0.5 text-xs text-muted-foreground">We&apos;ll fetch your recent posts so you can pick which to feature.</p>
          {fetchedPosts === null ? (
            <button
              type="button"
              onClick={loadInstagramPosts}
              disabled={loadingPosts}
              className="mt-3 px-4 py-2 border border-foreground text-foreground text-sm font-medium rounded-full hover:bg-muted disabled:opacity-60"
            >
              {loadingPosts ? "Loading…" : "Load Instagram posts"}
            </button>
          ) : (
            <>
              <button type="button" onClick={loadInstagramPosts} disabled={loadingPosts} className="mt-3 text-xs text-muted-foreground hover:underline disabled:opacity-60">
                {loadingPosts ? "Refreshing…" : "Refresh"}
              </button>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {fetchedPosts.map((post) => {
                  const inKit = isPostInKit(post.id);
                  const fmt = (n?: number) => n == null ? null : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);
                  const metrics = [
                    post.views && { label: "Views", val: fmt(post.views) },
                    post.reach && !post.views && { label: "Reach", val: fmt(post.reach) },
                    post.likes && { label: "Likes", val: fmt(post.likes) },
                    post.saves && { label: "Saves", val: fmt(post.saves) },
                  ].filter(Boolean) as { label: string; val: string | null }[];
                  return (
                    <div key={post.id} className={`rounded-xl border overflow-hidden bg-background ${inKit ? "border-foreground/30 opacity-60" : "border-border"}`}>
                      <div className="aspect-square relative bg-muted">
                        {post.thumbnailUrl
                          ? <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                        }
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded-full">
                          {post.mediaType === "VIDEO" ? "Reel" : post.mediaType === "CAROUSEL_ALBUM" ? "Carousel" : "Photo"}
                        </span>
                        {inKit && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-foreground text-background text-[10px] font-medium rounded-full">✓ Added</span>
                        )}
                      </div>
                      {metrics.length > 0 && (
                        <div className="px-2 py-1.5 flex flex-wrap gap-x-3 gap-y-0.5 border-b border-border">
                          {metrics.map(({ label, val }) => (
                            <span key={label} className="text-[10px] text-muted-foreground">
                              <span className="font-semibold text-foreground">{val}</span> {label}
                            </span>
                          ))}
                        </div>
                      )}
                      {!inKit
                        ? <button type="button" onClick={() => addPostToKit(post)} className="w-full py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">+ Add to kit</button>
                        : <p className="py-1.5 text-center text-[10px] text-muted-foreground">In kit</p>
                      }
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">Or add an entry manually below.</p>
        <div className="mt-4 space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWorkSampleDragEnd}>
            <SortableContext items={workSamples.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {workSamples.map((s) => (
                <SortableWorkSample
                  key={s.id}
                  sample={s}
                  onUpdate={updateWorkSample}
                  onRemove={removeWorkSample}
                />
              ))}
            </SortableContext>
          </DndContext>
          <button
            type="button"
            onClick={addWorkSample}
            className="w-full py-3 border border-dashed border-border rounded-2xl text-sm text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
          >
            + Add work sample
          </button>
        </div>
      </div>

      {/* Rates */}
      <div className="p-6 border border-border rounded-2xl bg-background">
        <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Rates</h3>
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
                <label className="block text-xs text-muted-foreground mb-1">From amount ($)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="2500"
                  value={rates.fromAmount ?? ""}
                  onChange={(e) => setRates((r) => ({ ...r, fromAmount: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full max-w-xs px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground">Leave empty for &quot;Contact for rates&quot;</p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Button label</label>
                <input
                  type="text"
                  placeholder="Get in touch"
                  value={rates.ctaLabel ?? ""}
                  onChange={(e) => setRates((r) => ({ ...r, ctaLabel: e.target.value || undefined }))}
                  className="w-full max-w-xs px-3 py-2.5 border border-border rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Brands */}
      <div className="p-6 border border-border rounded-2xl bg-background">
        <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Brands I&apos;ve worked with</h3>
        <p className="mt-1 text-sm text-muted-foreground">Add past partners for social proof.</p>
        <div className="mt-4 space-y-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBrandDragEnd}>
            <SortableContext items={brands.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {brands.map((b) => (
                <SortableBrand
                  key={b.id}
                  brand={b}
                  onUpdate={updateBrand}
                  onRemove={removeBrand}
                />
              ))}
            </SortableContext>
          </DndContext>
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
