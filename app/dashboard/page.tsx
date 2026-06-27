"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { SubscribeButton } from "../components/SubscribeButton";
import {
  getEnabledPlatformIds,
  getPlatformMeta,
  type PlatformId,
  type PlatformStatsWithCharts,
} from "@/lib/platforms";
import { AppNav } from "../components/AppNav";
import { ProfileForm, type ProfileFormProfile } from "../components/ProfileForm";
import { DashboardSkeleton, StatCardSkeleton, KitCardSkeleton, CountUp } from "../components/Skeleton";
import { AnalyticsChart } from "../components/AnalyticsChart";
import type { KitRecord } from "@/lib/kit-storage";
import type { ProfilePayload } from "@/app/api/me/profile/route";
import { APP_URL, APP_HOST } from "@/lib/app-url";

// ─── Types ───────────────────────────────────────────────────────────────────

interface KitViewRecord {
  id: string;
  viewedAt: string;
  referrer: string | null;
  kit: { id: string; name: string; slug: string };
}

import { DealPipeline, type InquiryRecord, type DealStatus } from "../components/DealPipeline";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function referrerDomain(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// ─── Design system primitives ────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-background border-border rounded-2xl border p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mb-4 text-[11px] font-semibold tracking-[0.16em] uppercase">
      {children}
    </p>
  );
}

function PrimaryBtn({
  children,
  onClick,
  disabled,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`bg-foreground text-background inline-flex h-10 items-center rounded-full px-5 text-sm font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function SecondaryBtn({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-flex h-10 items-center rounded-full border px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}

// ─── Vibe accent color map ────────────────────────────────────────────────────

const VIBE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  editorial: { bg: "#111110", fg: "#f5f0e8", label: "Editorial" },
  studio:    { bg: "#e8e6e1", fg: "#2d2d2b", label: "Studio" },
  noir:      { bg: "#1a1a18", fg: "#c9a84c", label: "Noir" },
  bloom:     { bg: "#f5ede4", fg: "#c97b4b", label: "Bloom" },
  electric:  { bg: "#0d0d1a", fg: "#6366f1", label: "Electric" },
  // Legacy presets
  warm:      { bg: "#F5F3F0", fg: "#1A1A1A", label: "Warm" },
  cool:      { bg: "#F0F3F7", fg: "#1E3A5F", label: "Cool" },
  paper:     { bg: "#FAFAF8", fg: "#111111", label: "Paper" },
};

// ─── Kit card ────────────────────────────────────────────────────────────────

function KitCard({
  kit,
  onDelete,
  onSlugChange,
  onPasswordChange,
}: {
  kit: KitRecord & { appearance?: { preset?: string }; hasPassword?: boolean };
  onDelete: () => void;
  onSlugChange: (id: string, newSlug: string) => void;
  onPasswordChange: (id: string, hasPassword: boolean) => void;
}) {
  const preset = (kit as { appearance?: { preset?: string } }).appearance?.preset ?? "warm";
  const vibe = VIBE_COLORS[preset] ?? VIBE_COLORS.warm;
  const [exporting, setExporting] = useState<"pdf" | "pptx" | null>(null);
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState(kit.slug);
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const slugInputRef = useRef<HTMLInputElement>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const hasPassword = (kit as { hasPassword?: boolean }).hasPassword ?? false;

  async function downloadFile(format: "pdf" | "pptx") {
    setExporting(format);
    try {
      const endpoint = format === "pptx" ? `/api/kits/${kit.id}/export-pptx` : `/api/kits/${kit.id}/export`;
      const res = await fetch(endpoint, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kit.slug}-media-kit.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setExporting(null);
    }
  }

  async function savePassword(remove = false) {
    setPasswordSaving(true);
    setPasswordError(null);
    try {
      const res = await fetch(`/api/kits/${kit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: remove ? "" : passwordDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setPasswordError(data.error ?? "Failed"); return; }
      onPasswordChange(kit.id, !remove && !!passwordDraft);
      setShowPasswordModal(false);
      setPasswordDraft("");
    } finally {
      setPasswordSaving(false);
    }
  }

  function copyLink() {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/kit/${kit.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function startEditSlug() {
    setSlugDraft(kit.slug);
    setSlugError(null);
    setEditingSlug(true);
    setTimeout(() => slugInputRef.current?.select(), 50);
  }

  async function saveSlug() {
    const clean = slugDraft.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (!clean || clean === kit.slug) { setEditingSlug(false); return; }
    setSlugSaving(true);
    setSlugError(null);
    try {
      const res = await fetch(`/api/kits/${kit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug: clean }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSlugError(data.error ?? "Could not update URL"); return; }
      onSlugChange(kit.id, data.slug ?? clean);
      setEditingSlug(false);
    } finally {
      setSlugSaving(false);
    }
  }

  return (
    <div className="border-border bg-background group relative overflow-hidden rounded-2xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      {/* Vibe color strip */}
      <div
        className="relative flex h-28 items-center justify-center px-5"
        style={{ backgroundColor: vibe.bg }}
      >
        <span
          className="absolute left-4 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide"
          style={{ backgroundColor: vibe.fg + "22", color: vibe.fg, border: `1px solid ${vibe.fg}33` }}
        >
          {vibe.label}
        </span>
        <div className="absolute right-4 top-3 flex items-center gap-1.5">
          {hasPassword && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold tracking-wide opacity-80"
              style={{ backgroundColor: vibe.fg + "18", color: vibe.fg }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Private
            </span>
          )}
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide opacity-80"
            style={{ backgroundColor: vibe.fg + "18", color: vibe.fg }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        </div>
        <p
          className="font-display text-xl font-semibold text-center px-10 leading-tight"
          style={{ color: vibe.fg }}
        >
          {kit.name}
        </p>
      </div>

      {/* URL row with inline slug editing */}
      <div className="px-5 py-3">
        {editingSlug ? (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs shrink-0">/kit/</span>
            <input
              ref={slugInputRef}
              value={slugDraft}
              onChange={(e) => { setSlugDraft(e.target.value); setSlugError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") saveSlug(); if (e.key === "Escape") setEditingSlug(false); }}
              className="flex-1 min-w-0 border-border rounded-lg border px-2 py-1 text-xs font-mono bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
              autoFocus
            />
            <button
              type="button"
              onClick={saveSlug}
              disabled={slugSaving}
              className="text-xs font-medium text-foreground hover:opacity-70 disabled:opacity-40 transition-opacity shrink-0"
            >
              {slugSaving ? "…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditingSlug(false)}
              className="text-xs text-muted-foreground hover:text-foreground shrink-0"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-muted-foreground text-xs truncate">/kit/{kit.slug}</p>
              <button
                type="button"
                onClick={startEditSlug}
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0"
                title="Edit URL slug"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {typeof kit.viewCount === "number" && (
                <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium">
                  {kit.viewCount === 0 ? "0 views" : `${kit.viewCount} view${kit.viewCount !== 1 ? "s" : ""}`}
                </span>
              )}
              <button
                type="button"
                onClick={copyLink}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Copy link"
              >
                {copied ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
        {slugError && <p className="mt-1 text-[11px] text-red-500">{slugError}</p>}
      </div>

      <div className="border-border flex items-center gap-2 border-t px-4 py-3">
        <Link
          href={`/kit/edit?id=${encodeURIComponent(kit.id)}`}
          className="bg-foreground text-background inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-80"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          </svg>
          Edit
        </Link>
        <button
          type="button"
          onClick={() => setShowShareModal(true)}
          className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>
          </svg>
          Share
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setPasswordDraft(""); setPasswordError(null); setShowPasswordModal(true); }}
            className={`inline-flex items-center rounded-full p-2 transition-colors ${hasPassword ? "text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            title={hasPassword ? "Private — click to manage" : "Set a password"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="text-muted-foreground hover:text-red-600 hover:bg-red-50 inline-flex items-center rounded-full p-2 transition-colors"
            aria-label="Delete kit"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Share modal */}
      {mounted && showShareModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-background border-border w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-semibold text-foreground text-sm">Share kit</h3>
                <p className="text-muted-foreground text-xs mt-0.5">{kit.name}</p>
              </div>
              <button type="button" onClick={() => setShowShareModal(false)} className="text-muted-foreground hover:text-foreground p-1 transition-colors">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-3">
              {/* Copy link */}
              <div className="rounded-xl border border-border p-4">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-2">Public link</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 truncate text-xs text-foreground bg-muted rounded-lg px-3 py-2 font-mono">
                    {typeof window !== "undefined" ? window.location.origin : "https://kitevo.com"}/kit/{kit.slug}
                  </code>
                  <button
                    type="button"
                    onClick={copyLink}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${copied ? "bg-emerald-500 text-white" : "bg-foreground text-background hover:opacity-80"}`}
                  >
                    {copied ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="20 6 9 17 4 12"/></svg>
                        Copied
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Download section */}
              <div className="rounded-xl border border-border p-4">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3">Download</p>
                <div className="space-y-2">
                  {/* PPTX */}
                  <button
                    type="button"
                    onClick={() => downloadFile("pptx")}
                    disabled={!!exporting}
                    className="w-full flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-muted/50 transition-colors disabled:opacity-50 text-left"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/30">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500" aria-hidden>
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">PowerPoint (.pptx)</p>
                      <p className="text-xs text-muted-foreground">Opens in Google Slides or PowerPoint</p>
                    </div>
                    {exporting === "pptx" ? (
                      <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0" aria-hidden>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                      </svg>
                    )}
                  </button>

                  {/* PDF */}
                  <button
                    type="button"
                    onClick={() => downloadFile("pdf")}
                    disabled={!!exporting}
                    className="w-full flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:bg-muted/50 transition-colors disabled:opacity-50 text-left"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/30">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500" aria-hidden>
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">PDF (.pdf)</p>
                      <p className="text-xs text-muted-foreground">Print-ready, universally supported</p>
                    </div>
                    {exporting === "pdf" ? (
                      <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0" aria-hidden>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* View live */}
              <a
                href={`/kit/${kit.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>
                </svg>
                View live kit
              </a>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Password modal */}
      {mounted && showPasswordModal && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="bg-background border-border w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-foreground mb-1">
              {hasPassword ? "Password protection" : "Set a password"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {hasPassword
                ? "Your kit is private. Set a new password or remove protection."
                : "Only people with the password can view this kit."}
            </p>
            <input
              type="password"
              value={passwordDraft}
              onChange={(e) => { setPasswordDraft(e.target.value); setPasswordError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && passwordDraft) savePassword(); }}
              placeholder={hasPassword ? "New password (leave blank to keep current)" : "Enter a password"}
              className="w-full px-4 py-2.5 border border-border rounded-xl bg-background text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 transition mb-2"
              autoFocus
            />
            {passwordError && <p className="text-red-500 text-xs mb-2">{passwordError}</p>}
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => savePassword()}
                disabled={passwordSaving || !passwordDraft}
                className="bg-foreground text-background inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {passwordSaving ? "Saving…" : hasPassword ? "Update password" : "Set password"}
              </button>
              {hasPassword && (
                <button
                  type="button"
                  onClick={() => savePassword(true)}
                  disabled={passwordSaving}
                  className="text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Remove password
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="border-border text-muted-foreground hover:text-foreground inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors ml-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

function DashboardContent() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [allowedKits, setAllowedKits] = useState(1);
  const [tierId, setTierId] = useState<string | null>(null);
  const [tierName, setTierName] = useState<string | null>(null);
  const [kits, setKits] = useState<KitRecord[]>([]);
  const [profile, setProfile] = useState<ProfileFormProfile | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const router = useRouter();
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState<Record<string, PlatformStatsWithCharts> | null>(null);
  const [enabledPlatformIds] = useState<PlatformId[]>(() => getEnabledPlatformIds());
  const [showAddKit, setShowAddKit] = useState(false);
  const [newKitName, setNewKitName] = useState("");
  const [newKitSlug, setNewKitSlug] = useState("");
  const [addKitError, setAddKitError] = useState("");
  const [kitToDelete, setKitToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [inquiriesLoaded, setInquiriesLoaded] = useState(false);
  const [kitViews, setKitViews] = useState<KitViewRecord[]>([]);
  const [kitViewsThisWeek, setKitViewsThisWeek] = useState(0);
  const [kitViewsTotal, setKitViewsTotal] = useState(0);
  const [kitViewsDaily, setKitViewsDaily] = useState<{ date: string; count: number }[]>([]);
  const [kitViewsReferrers, setKitViewsReferrers] = useState<{ source: string; count: number }[]>([]);
  const [kitViewsByKit, setKitViewsByKit] = useState<{ id: string; name: string; slug: string; count: number }[]>([]);
  const [kitViewsTrend, setKitViewsTrend] = useState<number | null>(null);
  const [kitViewsDays, setKitViewsDays] = useState(30);
  const [kitViewsLoaded, setKitViewsLoaded] = useState(false);
  const [disconnectingInstagram, setDisconnectingInstagram] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "activity">("inbox");
  const [urlCopied, setUrlCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const sessionId = searchParams.get("session_id") ?? null;
  const instagramConnectedParam = searchParams.get("instagram_connected");
  const instagramErrorParam = searchParams.get("instagram_error");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const body = sessionId ? { session_id: sessionId } : {};
      const res = await fetch("/api/subscription-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (cancelled) return;
      const data = await res.json().catch(() => ({}));
      setIsSubscribed(data.hasSubscription === true);
      setAllowedKits(typeof data.allowedKits === "number" ? data.allowedKits : 1);
      setTierId(data.tierId ?? null);
      setTierName(data.tierName ?? null);
      setSubscriptionLoaded(true);
    }
    check();
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/kits", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (cancelled || data === null) return;
        setKits(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isSubscribed]);

  const fetchKitViews = useCallback((days: number) => {
    fetch(`/api/kit-views?days=${days}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setKitViews(Array.isArray(data.views) ? data.views : []);
        setKitViewsThisWeek(typeof data.thisWeek === "number" ? data.thisWeek : 0);
        setKitViewsTotal(typeof data.total === "number" ? data.total : 0);
        setKitViewsDaily(Array.isArray(data.daily) ? data.daily : []);
        setKitViewsReferrers(Array.isArray(data.referrers) ? data.referrers : []);
        setKitViewsByKit(Array.isArray(data.byKit) ? data.byKit : []);
        setKitViewsTrend(typeof data.trend === "number" ? data.trend : null);
        setKitViewsLoaded(true);
      })
      .catch(() => setKitViewsLoaded(true));
  }, []);

  useEffect(() => {
    if (!isSubscribed) return;
    fetchKitViews(kitViewsDays);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSubscribed]);

  useEffect(() => {
    if (tierId !== "pro") return;
    let cancelled = false;
    fetch("/api/inquiries", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) { setInquiries(Array.isArray(data) ? data : []); setInquiriesLoaded(true); }
      })
      .catch(() => { if (!cancelled) setInquiriesLoaded(true); });
    return () => { cancelled = true; };
  }, [tierId]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/profile", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) { setProfile(data); setProfileLoaded(true); }
      })
      .catch(() => {
        if (!cancelled) { setProfile(null); setProfileLoaded(true); }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!profileLoaded || profile === null) return;
    if (profile.onboardingCompletedAt == null || profile.onboardingCompletedAt === "") {
      router.replace("/onboarding");
    }
  }, [profileLoaded, profile, router]);

  useEffect(() => {
    if (!subscriptionLoaded || !profileLoaded) return;
    if (profile !== null && (profile.onboardingCompletedAt == null || profile.onboardingCompletedAt === "")) return;
    setLoading(false);
  }, [subscriptionLoaded, profileLoaded, profile]);

  useEffect(() => {
    if (!isSubscribed) return;
    let cancelled = false;
    fetch("/api/instagram/stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((stats) => {
        if (!cancelled) setPlatformStats(stats ? { instagram: stats } : {});
      })
      .catch(() => { if (!cancelled) setPlatformStats({}); });
    return () => { cancelled = true; };
  }, [isSubscribed]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/instagram/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setInstagramConnected(data.connected === true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [instagramConnectedParam]);

  const handleDisconnectInstagram = async () => {
    setDisconnectingInstagram(true);
    try {
      const res = await fetch("/api/instagram/disconnect", { method: "POST", credentials: "include" });
      if (res.ok) setInstagramConnected(false);
    } finally {
      setDisconnectingInstagram(false);
    }
  };

  const instagramErrorMessages: Record<string, string> = {
    not_configured: "Instagram connect is not configured. Add META_APP_ID and META_APP_SECRET.",
    invalid: "Invalid or expired request. Try connecting again.",
    no_pages: "No Facebook Page found. Create a Page and try again.",
    permission_denied: "Meta declined access. Grant all requested permissions when prompted.",
    no_instagram_account: "No Instagram Business or Creator account linked to your Page.",
    server: "Something went wrong. Try again later.",
    access_denied: "You declined access. Connect again to grant permissions.",
  };

  const createKit = async () => {
    if (!newKitSlug.trim()) return;
    setAddKitError("");
    const res = await fetch("/api/kits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: newKitSlug.trim(), name: newKitName.trim() }),
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.id) {
      setShowAddKit(false);
      setNewKitName("");
      setNewKitSlug("");
      fetch("/api/kits", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => setKits(Array.isArray(list) ? list : []));
      window.location.href = `/kit/edit?id=${encodeURIComponent(data.id)}`;
    } else {
      setAddKitError(data.error ?? "Failed to create kit");
    }
  };

  const deleteKit = async () => {
    if (!kitToDelete) return;
    setDeleteError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/kits/${kitToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setKits((prev) => prev.filter((k) => k.id !== kitToDelete.id));
        setKitToDelete(null);
      } else {
        setDeleteError("Failed to delete kit. Try again.");
      }
    } catch {
      setDeleteError("Something went wrong. Try again.");
    } finally {
      setDeleteLoading(false);
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
      if (data.url) { window.location.href = data.url; return; }
      alert(data.error || "Could not open billing portal.");
    } catch {
      alert("Something went wrong.");
    } finally {
      setPortalLoading(false);
    }
  };

  const upgradeToProLoading = upgradeLoading;
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
      } else {
        alert(data.error || "Upgrade failed");
      }
    } catch {
      alert("Something went wrong");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const updateInquiryStatus = async (id: string, status: DealStatus) => {
    setInquiries((prev) =>
      prev.map((i) => i.id === id ? { ...i, status, read: status !== "new" ? true : i.read } : i)
    );
    fetch(`/api/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
      credentials: "include",
    }).catch(() => {});
  };

  // Derived helpers
  const firstName = profile?.name?.split(" ")[0] ?? "there";
  const avatarUrl = profile?.avatarUrl ?? null;
  const avatarInitials = profile?.name
    ? profile.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";
  const primaryKit = kits[0] ?? null;
  const primaryKitUrl = primaryKit ? `${APP_HOST}/kit/${primaryKit.slug}` : null;

  const handleCopyUrl = () => {
    if (!primaryKit) return;
    navigator.clipboard.writeText(`${APP_URL}/kit/${primaryKit.slug}`).catch(() => {});
    setUrlCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setUrlCopied(false), 2000);
  };

  // Aggregate stats
  const instagramStats = platformStats?.["instagram"] ?? null;
  const totalViews = kits.reduce((sum, k) => sum + (k.viewCount ?? 0), 0);

  return (
    <div className="min-h-screen bg-muted/20">
      {/* ── Delete confirmation modal ── */}
      {kitToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => !deleteLoading && (setKitToDelete(null), setDeleteError(null))}
        >
          <div
            className="bg-background border-border w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-foreground text-lg font-semibold">Delete kit?</h3>
            <p className="text-muted-foreground mt-2 text-sm">
              &ldquo;{kitToDelete.name}&rdquo; will be permanently removed. This cannot be undone.
            </p>
            {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <SecondaryBtn
                disabled={deleteLoading}
                onClick={() => { setKitToDelete(null); setDeleteError(null); }}
              >
                Cancel
              </SecondaryBtn>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={deleteKit}
                className="inline-flex h-10 items-center rounded-full bg-red-600 px-5 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AppNav
        links={[
          { href: "/pricing", label: "Pricing" },
          { href: kits[0] ? `/kit/${kits[0].slug}` : "/kit/demo", label: "View Kit", external: true },
        ]}
        onLogout={async () => {
          await fetch("/api/auth/clear-session-cookies", { method: "POST", credentials: "include" });
          signOut({ callbackUrl: "/" });
        }}
      />

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-24 sm:px-8 lg:px-10">
        {/* ── Status banners ── */}
        {success && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Payment successful! Your media kit is now live.
          </div>
        )}
        {instagramConnectedParam === "1" && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Instagram connected. Your stats and posts will now load from your account.
          </div>
        )}
        {instagramErrorParam && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p>{instagramErrorMessages[instagramErrorParam] ?? `Instagram: ${instagramErrorParam}`}</p>
            <Link href="/help/instagram" className="mt-2 inline-block text-sm font-medium underline underline-offset-4 hover:no-underline">
              See connection help →
            </Link>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          <DashboardSkeleton />
        ) : !isSubscribed ? (
          /* ── Upgrade gate ── */
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="flex flex-col justify-between">
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.16em] uppercase">
                  Get started
                </p>
                <h2 className="font-display text-foreground text-2xl font-semibold tracking-tight">
                  Unlock your media kit
                </h2>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  Subscribe to publish your professional pitch page with live Instagram stats, audience demographics, and growth charts brands actually want to see.
                </p>
              </div>
              <div className="mt-8">
                <SubscribeButton email={profile?.email} />
              </div>
            </Card>

            <div className="space-y-3">
              {[
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                  ),
                  label: "Live Instagram stats",
                  desc: "Follower count, engagement rate, and demographics — always up to date.",
                },
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><line x1="2" y1="12" x2="22" y2="12"/>
                    </svg>
                  ),
                  label: "Brand Kit Vibes (Pro)",
                  desc: "5 signature design styles. Custom colors, fonts, and logo upload.",
                },
                {
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                  ),
                  label: "Shareable link",
                  desc: `Your kit lives at ${APP_HOST}/kit/[you]. One link for every brand pitch.`,
                },
              ].map((item) => (
                <div key={item.label} className="border-border bg-background flex gap-4 rounded-2xl border p-5">
                  <div className="mt-0.5 shrink-0 text-muted-foreground">{item.icon}</div>
                  <div>
                    <p className="text-foreground text-sm font-semibold">{item.label}</p>
                    <p className="text-muted-foreground mt-0.5 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Subscribed dashboard ── */
          <div className="space-y-6">
            {/* ── Welcome banner ── */}
            <div className="bg-[#111110] dark:bg-[#1c1c1a] dark:border dark:border-[#2a2a28] rounded-2xl px-6 py-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  {/* Avatar — click to edit profile */}
                  <Link href="/profile" className="shrink-0 group relative">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={profile?.name ?? "Avatar"}
                        className="h-11 w-11 rounded-full object-cover transition-opacity group-hover:opacity-75"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center transition-opacity group-hover:opacity-75">
                        <span className="font-display text-sm font-semibold text-white/80">{avatarInitials}</span>
                      </div>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </span>
                  </Link>
                  <div>
                    <p className="text-white/50 text-[11px] font-semibold tracking-[0.16em] uppercase mb-0.5">Welcome back</p>
                    <p className="font-display text-xl font-semibold text-white leading-none">{firstName}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="text-white/50 hover:text-white/80 text-xs transition-colors ml-1"
                  >
                    Edit profile →
                  </Link>
                </div>

                {/* Kit URL pill — only if kits exist */}
                {primaryKitUrl && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-white/8 rounded-full px-4 py-2">
                      <span className="text-white/40 text-xs font-mono hidden sm:inline">{primaryKitUrl}</span>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="text-white/60 hover:text-white transition-colors"
                        aria-label="Copy kit URL"
                      >
                        {urlCopied ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <a
                      href={`/kit/${primaryKit!.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/70 hover:text-white text-xs font-medium transition-colors whitespace-nowrap"
                    >
                      View →
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* ── Metrics bar ── */}
            <div className="bg-background border-border rounded-2xl border">
              <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
                {/* Followers */}
                <div className="px-6 py-5">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase mb-2">Followers</p>
                  {!platformStats ? (
                    <div className="h-8 w-20 bg-muted animate-pulse rounded-full" />
                  ) : instagramStats ? (
                    <p className="font-display text-foreground text-2xl font-semibold tabular-nums">
                      <CountUp value={instagramStats.followers} duration={1400} />
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">—</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-0.5">Instagram</p>
                </div>

                {/* Engagement */}
                <div className="px-6 py-5">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase mb-2">Engagement</p>
                  {!platformStats ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded-full" />
                  ) : instagramStats ? (
                    <p className="font-display text-foreground text-2xl font-semibold tabular-nums">
                      <CountUp value={instagramStats.avgEngagement} decimals={1} suffix="%" duration={1000} />
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">—</p>
                  )}
                  <p className="text-muted-foreground text-xs mt-0.5">avg rate</p>
                </div>

                {/* Views this week */}
                <div className="px-6 py-5">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase mb-2">Views this week</p>
                  {!kitViewsLoaded ? (
                    <div className="h-8 w-12 bg-muted animate-pulse rounded-full" />
                  ) : (
                    <p className="font-display text-foreground text-2xl font-semibold tabular-nums">
                      <CountUp value={kitViewsThisWeek} duration={1000} />
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs mt-0.5">kit page visits</p>
                </div>

                {/* All time views */}
                <div className="px-6 py-5">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase mb-2">All time views</p>
                  {!kitViewsLoaded ? (
                    <div className="h-8 w-14 bg-muted animate-pulse rounded-full" />
                  ) : (
                    <p className="font-display text-foreground text-2xl font-semibold tabular-nums">
                      <CountUp value={totalViews} duration={1200} />
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs mt-0.5">across all kits</p>
                </div>
              </div>
            </div>

            {/* ── Pipeline / Activity ── */}
            {(tierId === "pro" || (kitViewsLoaded && kits.length > 0)) && (
              <div>
                <div className="mb-4 flex items-center gap-1">
                  {tierId === "pro" && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("inbox")}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        activeTab === "inbox"
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Pipeline
                      {inquiries.filter((i) => !i.read).length > 0 && (
                        <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          activeTab === "inbox" ? "bg-white/20 text-white" : "bg-foreground text-background"
                        }`}>
                          {inquiries.filter((i) => !i.read).length}
                        </span>
                      )}
                    </button>
                  )}
                  {kitViewsLoaded && kits.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab("activity")}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                        activeTab === "activity"
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Activity
                    </button>
                  )}
                </div>

                {activeTab === "inbox" && tierId === "pro" && (
                  <div>
                    {!inquiriesLoaded ? (
                      <p className="text-muted-foreground text-sm">Loading…</p>
                    ) : inquiries.length === 0 ? (
                      <div className="border-border rounded-2xl border border-dashed p-8 text-center">
                        <p className="text-foreground text-sm font-semibold">No inquiries yet</p>
                        <p className="text-muted-foreground mt-1 text-sm">
                          When brands fill out your inquiry form, they&apos;ll appear here as deals to track.
                        </p>
                      </div>
                    ) : (
                      <DealPipeline inquiries={inquiries} onUpdate={updateInquiryStatus} />
                    )}
                  </div>
                )}

                {activeTab === "activity" && kitViewsLoaded && kits.length > 0 && (
                  <div>
                    {kitViewsTotal === 0 ? (
                      <div className="border-border rounded-2xl border border-dashed p-8 text-center">
                        <p className="text-foreground text-sm font-semibold">No views yet</p>
                        <p className="text-muted-foreground mt-1 text-sm">Share your kit link and views will appear here in real time.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <AnalyticsChart
                          daily={kitViewsDaily}
                          referrers={kitViewsReferrers}
                          byKit={kitViewsByKit}
                          total={kitViewsTotal}
                          trend={kitViewsTrend}
                          days={kitViewsDays}
                          inquiryCount={inquiries.length}
                          wonCount={inquiries.filter((i) => i.status === "won").length}
                          onDaysChange={(d) => {
                            setKitViewsDays(d);
                            fetchKitViews(d);
                          }}
                        />
                        <div className="bg-background border-border rounded-2xl border overflow-hidden">
                          <p className="px-5 pt-5 pb-3 text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">Recent visits</p>
                          <div className="divide-y divide-border">
                            {kitViews.slice(0, 10).map((view) => {
                              const ago = timeAgo(view.viewedAt);
                              const domain = referrerDomain(view.referrer);
                              return (
                                <div key={view.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-muted/40 transition-colors">
                                  <div className="min-w-0">
                                    <p className="text-foreground text-sm font-medium truncate">{view.kit.name}</p>
                                    {domain && <p className="text-muted-foreground text-xs mt-0.5 truncate">via {domain}</p>}
                                  </div>
                                  <p className="text-muted-foreground text-xs shrink-0">{ago}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Kits ── */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">Your kits</p>
                {kits.length > 0 && kits.length < allowedKits && !showAddKit && (
                  <button
                    type="button"
                    onClick={() => setShowAddKit(true)}
                    className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors"
                  >
                    + New kit
                  </button>
                )}
              </div>

              {/* Empty state */}
              {kits.length === 0 && allowedKits > 0 && (
                <div className="border-border rounded-2xl border border-dashed p-8 max-w-md">
                  <p className="text-foreground text-base font-semibold">Create your first kit</p>
                  <p className="text-muted-foreground mt-1 text-sm">Give it a name and a URL slug. Add work samples, rates, and brands in the editor.</p>
                  <div className="mt-6 space-y-3">
                    <TextInput value={newKitName} onChange={setNewKitName} placeholder="Kit name (e.g. Fashion & Lifestyle)" />
                    <TextInput value={newKitSlug} onChange={setNewKitSlug} placeholder="URL slug (e.g. my-fashion-kit)" />
                    {addKitError && <p className="text-sm text-red-600">{addKitError}</p>}
                    <PrimaryBtn onClick={createKit}>Create &amp; edit →</PrimaryBtn>
                  </div>
                </div>
              )}

              {/* Kit cards */}
              {!subscriptionLoaded ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <KitCardSkeleton /><KitCardSkeleton />
                </div>
              ) : kits.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {kits.map((kit) => (
                    <KitCard
                      key={kit.id}
                      kit={kit}
                      onDelete={() => { setDeleteError(null); setKitToDelete({ id: kit.id, name: kit.name }); }}
                      onSlugChange={(id, newSlug) => setKits((prev) => prev.map((k) => k.id === id ? { ...k, slug: newSlug } : k))}
                      onPasswordChange={(id, hp) => setKits((prev) => prev.map((k) => k.id === id ? { ...k, hasPassword: hp } : k))}
                    />
                  ))}
                </div>
              )}

              {/* Add kit form */}
              {showAddKit && kits.length > 0 && (
                <div className="border-border mt-4 space-y-3 rounded-2xl border p-5 max-w-md">
                  <p className="text-foreground text-sm font-semibold">New kit</p>
                  <TextInput value={newKitName} onChange={setNewKitName} placeholder="Kit name" />
                  <TextInput value={newKitSlug} onChange={setNewKitSlug} placeholder="URL slug (e.g. my-fashion-kit)" />
                  {addKitError && <p className="text-sm text-red-600">{addKitError}</p>}
                  <div className="flex gap-2">
                    <PrimaryBtn onClick={createKit}>Create &amp; edit →</PrimaryBtn>
                    <SecondaryBtn onClick={() => { setShowAddKit(false); setNewKitName(""); setNewKitSlug(""); }}>Cancel</SecondaryBtn>
                  </div>
                </div>
              )}

              {/* At limit message */}
              {kits.length >= allowedKits && kits.length > 0 && !showAddKit && (
                <p className="text-muted-foreground mt-4 text-sm">
                  At kit limit ({allowedKits}).{" "}
                  <Link href="/pricing" className="text-foreground underline underline-offset-4 hover:no-underline">Upgrade for more</Link>.
                </p>
              )}

              {/* Pro upgrade prompt for Starter users */}
              {tierId === "starter" && (
                <div className="border-border bg-background mt-4 flex items-center justify-between gap-4 rounded-2xl border p-5">
                  <div>
                    <p className="text-foreground text-sm font-semibold">Unlock Brand Kit Vibes</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">Pro gives you 5 signature styles, custom colors, fonts, and logo upload.</p>
                  </div>
                  <button
                    type="button"
                    onClick={upgradeToPro}
                    disabled={upgradeToProLoading}
                    className="bg-foreground text-background shrink-0 inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                  >
                    {upgradeToProLoading ? "…" : "Upgrade"}
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <span className="text-muted-foreground text-sm">Loading…</span>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
