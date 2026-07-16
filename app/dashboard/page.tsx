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
import { VerifiedBadge } from "../components/VerifiedBadge";
import { AvatarImg } from "../components/AvatarImg";

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
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeStats, setYoutubeStats] = useState<{ subscriberCount: number; viewCount: number; videoCount: number; channelTitle: string } | null>(null);
  const [disconnectingYoutube, setDisconnectingYoutube] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "activity">(() =>
    typeof window !== "undefined" && window.location.hash === "#inbox" ? "inbox" : "activity"
  );
  const [urlCopied, setUrlCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const sessionId = searchParams.get("session_id") ?? null;
  const instagramConnectedParam = searchParams.get("instagram_connected");
  const instagramErrorParam = searchParams.get("instagram_error");
  const youtubeParam = searchParams.get("youtube");

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
    if (!subscriptionLoaded) return;
    fetchKitViews(kitViewsDays);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionLoaded]);

  useEffect(() => {
    if (!tierId || tierId === "free") return;
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
      return;
    }
    // Brand accounts have their own dashboard
    if ((profile as { accountType?: string }).accountType === "brand") {
      router.replace("/brand");
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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/youtube/stats", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) {
          setYoutubeStats(data ?? null);
          setYoutubeConnected(!!data?.channelId);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [youtubeParam]);

  const handleDisconnectYoutube = async () => {
    setDisconnectingYoutube(true);
    try {
      const res = await fetch("/api/youtube/disconnect", { method: "POST", credentials: "include" });
      if (res.ok) { setYoutubeConnected(false); setYoutubeStats(null); }
    } finally {
      setDisconnectingYoutube(false);
    }
  };

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

  const markInquiryRead = async (id: string) => {
    setInquiries((prev) => prev.map((i) => i.id === id ? { ...i, read: true } : i));
    fetch(`/api/inquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
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
          { href: "/social/inbox", label: "Social" },
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
              See connection help
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
            <div className="bg-[#111110] dark:bg-[#1c1c1a] dark:border dark:border-[#2a2a28] rounded-2xl px-6 py-5 sm:px-7 sm:py-6">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <Link href="/profile" className="shrink-0 group relative">
                  <AvatarImg
                    src={avatarUrl}
                    alt={profile?.name ?? "Avatar"}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-white/10 transition-opacity group-hover:opacity-75"
                    fallback={
                      <div className="h-14 w-14 rounded-full bg-white/10 ring-2 ring-white/10 flex items-center justify-center transition-opacity group-hover:opacity-75">
                        <span className="font-display text-lg font-semibold text-white/80">{avatarInitials}</span>
                      </div>
                    }
                  />
                </Link>

                {/* Name + subtitle */}
                <div className="min-w-0 flex-1">
                  <p className="text-white/40 text-[10px] font-semibold tracking-[0.2em] uppercase leading-none mb-1.5">Welcome back</p>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-2xl font-semibold text-white leading-none tracking-tight truncate">{firstName}</p>
                    <VerifiedBadge tier={profile?.verifiedTier} size="md" />
                  </div>
                </div>

                {/* Actions — right side */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/profile"
                    className="text-white/50 hover:text-white/80 text-xs transition-colors"
                  >
                    Edit
                  </Link>
                  {primaryKitUrl && (
                    <>
                      <span className="text-white/20 text-xs">·</span>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="text-white/50 hover:text-white/80 transition-colors"
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
                      <a
                        href={`/kit/${primaryKit!.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/50 hover:text-white/80 text-xs font-medium transition-colors"
                      >
                        View
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Metrics bar — tiles built dynamically so there are no orphaned cells ── */}
            {(() => {
              const skel = (w: string) => <span className={`inline-block h-7 ${w} align-middle bg-muted animate-pulse rounded-full`} />;
              type Tile = { key: string; label: string; sub: string; node: React.ReactNode };
              const tiles: Tile[] = [];

              tiles.push({
                key: "followers", label: "Followers", sub: "Instagram",
                node: !platformStats ? skel("w-20") : instagramStats ? <CountUp value={instagramStats.followers} duration={1400} /> : <span className="text-muted-foreground text-base">—</span>,
              });
              if (youtubeConnected && youtubeStats) {
                tiles.push({ key: "subs", label: "Subscribers", sub: "YouTube", node: <CountUp value={youtubeStats.subscriberCount} duration={1400} /> });
              }
              // Only show engagement when it's a real, non-zero rate (0.0% reads as "no engagement").
              if (instagramStats && instagramStats.avgEngagement > 0) {
                tiles.push({ key: "eng", label: "Engagement", sub: "avg rate", node: <CountUp value={instagramStats.avgEngagement} decimals={1} suffix="%" duration={1000} /> });
              }
              tiles.push({
                key: "week", label: "Views this week", sub: "kit page visits",
                node: !kitViewsLoaded ? skel("w-12") : <CountUp value={kitViewsThisWeek} duration={1000} />,
              });
              tiles.push({
                key: "all", label: "All time views", sub: "across all kits",
                node: !kitViewsLoaded ? skel("w-14") : <CountUp value={totalViews} duration={1200} />,
              });

              const n = tiles.length;
              const cols = n >= 5 ? "lg:grid-cols-5" : n === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
              return (
                <div className="bg-background border-border rounded-2xl border overflow-hidden">
                  <div className={`grid grid-cols-2 ${cols} divide-x divide-y lg:divide-y-0 divide-border`}>
                    {tiles.map((t) => (
                      <div key={t.key} className="px-6 py-5">
                        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase mb-2">{t.label}</p>
                        <div className="font-display text-foreground text-2xl font-semibold tabular-nums tracking-tight leading-none">{t.node}</div>
                        <p className="text-muted-foreground text-xs mt-1.5">{t.sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── Pipeline / Activity ── */}
            {(kitViewsLoaded && kits.length > 0) || (tierId && tierId !== "free") ? (
              <div id="activity">
                <div className="mb-4 flex items-center gap-1">
                  {tierId && tierId !== "free" && (
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
                  {kitViewsLoaded && (
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

                {activeTab === "inbox" && tierId && tierId !== "free" && (
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
                      <DealPipeline inquiries={inquiries} onUpdate={updateInquiryStatus} onMarkRead={markInquiryRead} />
                    )}
                  </div>
                )}

                {activeTab === "activity" && kitViewsLoaded && (
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
            ) : null}

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

              {/* Empty state — no plan */}
              {subscriptionLoaded && kits.length === 0 && allowedKits === 0 && (
                <div className="border-border rounded-2xl border border-dashed p-8 max-w-md text-center">
                  <p className="text-foreground text-base font-semibold">Choose a plan to get started</p>
                  <p className="text-muted-foreground mt-1 text-sm">Pick a plan and create your first media kit in minutes.</p>
                  <Link
                    href="/pricing"
                    className="mt-5 inline-flex h-10 items-center rounded-full bg-foreground px-6 text-sm font-medium text-background hover:opacity-80 transition-opacity"
                  >
                    View plans
                  </Link>
                </div>
              )}

              {/* Empty state — has plan, no kit */}
              {kits.length === 0 && allowedKits > 0 && (
                <div className="border-border rounded-2xl border border-dashed p-8 max-w-md">
                  <p className="text-foreground text-base font-semibold">Create your first kit</p>
                  <p className="text-muted-foreground mt-1 text-sm">Give it a name and a URL. Connect Instagram or YouTube from the dashboard to show live stats.</p>
                  <div className="mt-6 space-y-3">
                    <TextInput value={newKitName} onChange={setNewKitName} placeholder="Kit name (e.g. Fashion & Lifestyle)" />
                    <TextInput value={newKitSlug} onChange={setNewKitSlug} placeholder="URL slug (e.g. my-fashion-kit)" />
                    {addKitError && <p className="text-sm text-red-600">{addKitError}</p>}
                    <PrimaryBtn onClick={createKit}>Create &amp; edit</PrimaryBtn>
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
                    <PrimaryBtn onClick={createKit}>Create &amp; edit</PrimaryBtn>
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

              {/* Free tier upgrade nudge */}
              {subscriptionLoaded && tierId === "free" && kits.length > 0 && (
                <div className="mt-4 rounded-2xl border border-border bg-muted/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">You&apos;re on the Free plan</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Upgrade to Starter to unlock live Instagram stats, growth charts, audience demographics, and section visibility controls.
                    </p>
                  </div>
                  <Link
                    href="/pricing?plan=starter"
                    className="shrink-0 bg-foreground text-background rounded-full px-5 py-2 text-sm font-medium hover:opacity-80 transition-opacity"
                  >
                    Upgrade to Starter
                  </Link>
                </div>
              )}

              {/* ── Integrations ── */}
              <div className="border-border rounded-2xl border overflow-hidden mt-4">
                <p className="px-5 pt-5 pb-3 text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground">Integrations</p>

                {/* YouTube */}
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF0000" aria-hidden="true">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-foreground text-sm font-semibold">YouTube</p>
                      {youtubeConnected && youtubeStats ? (
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {youtubeStats.channelTitle} · {youtubeStats.subscriberCount.toLocaleString()} subscribers
                        </p>
                      ) : (
                        <p className="text-muted-foreground text-xs mt-0.5">Show subscriber count on your kit</p>
                      )}
                    </div>
                  </div>
                  {youtubeConnected ? (
                    <button
                      type="button"
                      onClick={handleDisconnectYoutube}
                      disabled={disconnectingYoutube}
                      className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {disconnectingYoutube ? "…" : "Disconnect"}
                    </button>
                  ) : (
                    <a
                      href="/api/youtube/connect"
                      className="bg-foreground text-background inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition-opacity hover:opacity-80"
                    >
                      Connect
                    </a>
                  )}
                </div>

                {/* Instagram */}
                <div className="flex items-center justify-between gap-4 px-5 py-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-pink-50 dark:bg-pink-950/30 flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="url(#ig-grad)" aria-hidden="true">
                        <defs>
                          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f09433"/>
                            <stop offset="25%" stopColor="#e6683c"/>
                            <stop offset="50%" stopColor="#dc2743"/>
                            <stop offset="75%" stopColor="#cc2366"/>
                            <stop offset="100%" stopColor="#bc1888"/>
                          </linearGradient>
                        </defs>
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-foreground text-sm font-semibold">Instagram</p>
                      {instagramConnected ? (
                        <p className="text-muted-foreground text-xs mt-0.5">Connected · stats syncing</p>
                      ) : (
                        <p className="text-muted-foreground text-xs mt-0.5">Show live follower count and engagement</p>
                      )}
                    </div>
                  </div>
                  {instagramConnected ? (
                    <button
                      type="button"
                      onClick={handleDisconnectInstagram}
                      disabled={disconnectingInstagram}
                      className="border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      {disconnectingInstagram ? "…" : "Disconnect"}
                    </button>
                  ) : (
                    <a
                      href="/api/instagram/connect"
                      className="bg-foreground text-background inline-flex h-8 items-center rounded-full px-3 text-xs font-medium transition-opacity hover:opacity-80"
                    >
                      Connect
                    </a>
                  )}
                </div>
              </div>

              {/* Toasts */}
              {youtubeParam === "connected" && (
                <p className="text-emerald-600 text-sm mt-2">YouTube connected successfully.</p>
              )}
              {youtubeParam === "error" && (
                <p className="text-red-600 text-sm mt-2">YouTube connection failed. Please try again.</p>
              )}
              {youtubeParam === "no_channel" && (
                <p className="text-red-600 text-sm mt-2">No YouTube channel found on this Google account.</p>
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
