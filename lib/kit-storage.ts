/**
 * Kit content storage — localStorage until we have a DB.
 * Multi-kit: each kit has id, slug, name + content (work samples, rates, brands, section visibility).
 */

import type { WorkSample, KitRates, BrandPartner } from "./mock-data";
import { MOCK_CREATOR } from "./mock-data";
import { normalizeManualStats, type ManualStats } from "./manual-stats";

const STORAGE_KEY = "media_kit_pro_kit";
const STORAGE_KEY_MULTI = "media_kit_pro_kits";

/** Which sections to show on the public media kit page. */
export interface SectionVisibility {
  stats: boolean;
  workSamples: boolean;
  rates: boolean;
  brands: boolean;
  growthChart: boolean;
  audience: boolean;
  links: boolean;
}

export const DEFAULT_SECTION_VISIBILITY: SectionVisibility = {
  stats: true,
  workSamples: true,
  rates: true,
  brands: true,
  growthChart: true,
  audience: true,
  links: true,
};

export interface StoredKitContent {
  workSamples?: WorkSample[];
  rates: KitRates;
  brands: BrandPartner[];
  sectionVisibility?: SectionVisibility;
  manualStats?: ManualStats;
}

/** One kit in the multi-kit list. */
export interface KitRecord {
  id: string;
  slug: string;
  name: string;
  workSamples: WorkSample[];
  rates: KitRates;
  brands: BrandPartner[];
  sectionVisibility: SectionVisibility;
  manualStats?: ManualStats;
  /** View count from analytics (when loaded from API). */
  viewCount?: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizeVisibility(v: SectionVisibility | undefined): SectionVisibility {
  return v && typeof v === "object"
    ? { ...DEFAULT_SECTION_VISIBILITY, ...v }
    : DEFAULT_SECTION_VISIBILITY;
}

/** Migrate legacy single-kit storage into multi-kit list. */
function migrateFromLegacy(): KitRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return [];
    const o = parsed as Record<string, unknown>;
    if (!Array.isArray(o.workSamples) || !Array.isArray(o.brands)) return [];
    if (typeof o.rates !== "object" || o.rates === null) return [];
    const visibility = normalizeVisibility(o.sectionVisibility as SectionVisibility | undefined);
    const id = "kit_" + Math.random().toString(36).slice(2, 11);
    const slug = typeof o.slug === "string" && o.slug ? o.slug : MOCK_CREATOR.username;
    const name = typeof o.name === "string" && o.name ? o.name : "My Kit";
    const kit: KitRecord = {
      id,
      slug,
      name,
      workSamples: o.workSamples as WorkSample[],
      rates: o.rates as KitRates,
      brands: o.brands as BrandPartner[],
      sectionVisibility: visibility,
    };
    return [kit];
  } catch {
    return [];
  }
}

/** Read all kits from localStorage. (Phase 8 will load from DB for logged-in users.) */
export function getAllKits(): KitRecord[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MULTI);
    if (!raw || raw === "[]") return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as KitRecord[]).map((k) => ({
      ...k,
      sectionVisibility: normalizeVisibility(k.sectionVisibility),
      manualStats: normalizeManualStats(k.manualStats),
    }));
  } catch {
    return [];
  }
}

/** One-time migration: call to move legacy single-kit data into multi-kit list. Returns true if migration ran. */
export function migrateLegacyKitIfNeeded(): boolean {
  if (!isBrowser()) return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MULTI);
    if (raw && raw !== "[]") return false;
    const migrated = migrateFromLegacy();
    if (migrated.length > 0) {
      setAllKits(migrated);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

function setAllKits(kits: KitRecord[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY_MULTI, JSON.stringify(kits));
  } catch (e) {
    console.warn("kit-storage: setAllKits failed", e);
  }
}

export function getKitById(id: string): KitRecord | null {
  return getAllKits().find((k) => k.id === id) ?? null;
}

export function getKitBySlug(slug: string): KitRecord | null {
  return getAllKits().find((k) => k.slug === slug) ?? null;
}

/** Get content for one kit (for editor). Returns null if not found. */
export function getKitContent(kitId: string | null): StoredKitContent | null {
  if (!kitId) return null;
  const kit = getKitById(kitId);
  if (!kit) return null;
  return {
    workSamples: kit.workSamples,
    rates: kit.rates,
    brands: kit.brands,
    sectionVisibility: kit.sectionVisibility,
    manualStats: kit.manualStats,
  };
}

/** Update one kit's content. Creates placeholder kit if id not found (caller should use addKit for new). */
export function setKitContent(kitId: string, data: StoredKitContent): void {
  const kits = getAllKits();
  const idx = kits.findIndex((k) => k.id === kitId);
  const visibility = normalizeVisibility(data.sectionVisibility);
  if (idx >= 0) {
    kits[idx] = {
      ...kits[idx],
      workSamples: data.workSamples ?? kits[idx].workSamples,
      rates: data.rates,
      brands: data.brands,
      sectionVisibility: visibility,
      manualStats: normalizeManualStats(data.manualStats),
    };
    setAllKits(kits);
  }
}

/** Add a new kit. Returns the new kit. Slug must be unique. */
export function addKit(slug: string, name: string): KitRecord {
  const kits = getAllKits();
  const id = "kit_" + Math.random().toString(36).slice(2, 11);
  const kit: KitRecord = {
    id,
    slug: slug.trim().toLowerCase().replace(/\s+/g, "-"),
    name: name.trim() || "Untitled Kit",
    workSamples: [],
    rates: { show: false },
    brands: [],
    sectionVisibility: { ...DEFAULT_SECTION_VISIBILITY },
  };
  kits.push(kit);
  setAllKits(kits);
  return kit;
}

/** Remove a kit by id. */
export function deleteKit(kitId: string): void {
  const kits = getAllKits().filter((k) => k.id !== kitId);
  setAllKits(kits);
}

/** Backward compat: get first kit's content (for callers that don't pass kitId yet). */
export function getFirstKitContent(): StoredKitContent | null {
  const kits = getAllKits();
  const first = kits[0];
  if (!first) return null;
  return getKitContent(first.id);
}
