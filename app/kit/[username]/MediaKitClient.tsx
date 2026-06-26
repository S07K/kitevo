"use client";

import type React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { CountUp } from "@/app/components/Skeleton";
import type { PlatformId, PlatformStatsWithCharts } from "@/lib/platforms";
import { getPlatformMeta } from "@/lib/platforms";
import type { WorkSample, KitRates, BrandPartner } from "@/lib/mock-data";
import { DEFAULT_SECTION_VISIBILITY, type SectionVisibility } from "@/lib/kit-storage";
import type { KitAppearance, KitAppearancePreset } from "@/lib/kit-appearance";
import {
  DEFAULT_KIT_APPEARANCE,
  kitAppearanceToCssVars,
  kitAppearanceToCssVarsWithOverrides,
  kitChartColors,
} from "@/lib/kit-appearance";

const GrowthAreaChart = dynamic(
  () => import("./MediaKitRecharts").then((m) => m.GrowthAreaChart),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-52 min-h-[208px] w-full animate-pulse rounded-lg bg-[var(--mk-border)]/25"
        aria-hidden
      />
    ),
  }
);

const AudienceBarChart = dynamic(
  () => import("./MediaKitRecharts").then((m) => m.AudienceBarChart),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-40 min-h-[160px] w-full animate-pulse rounded-lg bg-[var(--mk-border)]/25"
        aria-hidden
      />
    ),
  }
);

interface MediaKitClientProps {
  username: string;
  creator: { name: string; username: string; bio: string; avatarUrl?: string | null };
  links: { label: string; url: string }[];
  platformStats: Record<string, PlatformStatsWithCharts>;
  enabledPlatformIds: PlatformId[];
  workSamples: WorkSample[];
  rates: KitRates;
  brands: BrandPartner[];
  sectionVisibility?: SectionVisibility;
  /** Public kit theme (saved per kit in the editor). */
  appearance?: KitAppearance;
  /** When false, stats/growth/audience sections show "Connect Instagram" overlay instead of mock data */
  instagramConnected?: boolean;
  /** Static demo kits (/kit/demo, etc.) — never show connect overlay; always show sample stats/charts */
  isDemoKit?: boolean;
  /** Kit DB id — required for inquiry form submissions */
  kitId?: string;
  /** When true, show the brand inquiry form (Pro feature) */
  inquiryEnabled?: boolean;
  /** When true, the logged-in user owns this kit — show dashboard nav bar */
  isOwner?: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

/** When Meta returns no time series, show a subtle trajectory from current follower count. */
function buildSyntheticGrowthFromFollowers(followers: number): { month: string; followers: number }[] {
  const f = Math.max(0, Math.round(followers));
  if (f <= 0) return [];
  return [
    { month: "Feb", followers: Math.round(f * 0.78) },
    { month: "Mar", followers: Math.round(f * 0.82) },
    { month: "Apr", followers: Math.round(f * 0.88) },
    { month: "May", followers: Math.round(f * 0.93) },
    { month: "Jun", followers: f },
    { month: "Jul", followers: f },
  ];
}

function InquiryForm({ kitId, creatorName }: { kitId: string; creatorName: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch(`/api/kits/${kitId}/inquire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, message }),
      });
      setStatus(res.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  }

  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-[var(--mk-border)] bg-[var(--mk-surface)] text-[var(--mk-text)] placeholder:text-[var(--mk-text-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--mk-text)]/30 font-sans transition";

  return (
    <section className="mt-24 sm:mt-28">
      <h2 className="font-display text-lg font-semibold text-[var(--mk-text)] tracking-tight text-center">
        Work together
      </h2>
      <p className="mt-2 text-sm text-[var(--mk-text-muted)] font-sans max-w-md mx-auto text-center">
        Interested in a collaboration? Send {creatorName.split(" ")[0]} a message and they&apos;ll get back to you.
      </p>

      {status === "sent" ? (
        <div className="mt-8 py-10 px-8 rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] text-center">
          <p className="font-display text-xl font-semibold text-[var(--mk-text)]">Message sent ✓</p>
          <p className="mt-2 text-sm text-[var(--mk-text-muted)] font-sans">
            Thanks for reaching out — you&apos;ll hear back soon.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4 max-w-lg mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Your name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
            <input
              type="email"
              placeholder="Your email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </div>
          <input
            type="text"
            placeholder="Company / brand (optional)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={inputCls}
          />
          <textarea
            placeholder="Tell me about the collaboration…"
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={inputCls + " resize-none"}
          />
          {status === "error" && (
            <p className="text-sm text-red-600 font-sans">
              Something went wrong — please try again.
            </p>
          )}
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full py-3.5 bg-[var(--mk-text)] text-[var(--mk-bg)] font-semibold text-sm rounded-full hover:opacity-90 transition-opacity disabled:opacity-60 font-sans"
          >
            {status === "sending" ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </section>
  );
}

function ConnectInstagramOverlay({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  return (
    <div
      className={`absolute inset-0 rounded-2xl bg-[var(--mk-bg)]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10 border border-[var(--mk-border)]/40 ${className}`}
      aria-hidden
    >
      <p className="font-display text-lg font-semibold text-[var(--mk-text)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--mk-text-muted)] font-sans">
        Connect your account in the dashboard to show real data here.
      </p>
      <Link
        href="/dashboard"
        className="mt-5 px-6 py-3 bg-[var(--mk-text)] text-[var(--mk-bg)] text-sm font-semibold rounded-full hover:opacity-90 transition-opacity"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}

function PatternLayer({ preset }: { preset: KitAppearancePreset }) {
  type PatternDef = { w: number; h: number; children: React.ReactNode };
  const defs: Partial<Record<KitAppearancePreset, PatternDef>> = {
    warm: { w: 20, h: 20, children: <circle cx="10" cy="10" r="1" fill="rgba(26,26,26,0.05)" /> },
    cool: { w: 20, h: 20, children: <line x1="0" y1="20" x2="20" y2="0" stroke="rgba(30,58,95,0.06)" strokeWidth="0.75" /> },
    paper: {
      w: 20, h: 20,
      children: <>
        <line x1="0" y1="0" x2="20" y2="0" stroke="rgba(17,17,17,0.04)" strokeWidth="0.5" />
        <line x1="0" y1="10" x2="20" y2="10" stroke="rgba(17,17,17,0.025)" strokeWidth="0.5" />
        <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(17,17,17,0.04)" strokeWidth="0.5" />
        <line x1="10" y1="0" x2="10" y2="20" stroke="rgba(17,17,17,0.025)" strokeWidth="0.5" />
      </>,
    },
    noir: { w: 16, h: 16, children: <circle cx="8" cy="8" r="0.6" fill="rgba(232,232,232,0.07)" /> },
    editorial: {
      w: 16, h: 16,
      children: <>
        <circle cx="4" cy="4" r="0.8" fill="rgba(245,240,232,0.08)" />
        <circle cx="12" cy="12" r="0.5" fill="rgba(245,240,232,0.06)" />
        <circle cx="12" cy="4" r="0.3" fill="rgba(245,240,232,0.05)" />
      </>,
    },
    studio: { w: 24, h: 24, children: <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(45,45,43,0.05)" strokeWidth="0.5" /> },
    bloom: {
      w: 30, h: 30,
      children: <>
        <circle cx="5" cy="5" r="1.5" fill="rgba(201,123,75,0.06)" />
        <circle cx="20" cy="15" r="1" fill="rgba(201,123,75,0.05)" />
        <circle cx="10" cy="25" r="0.8" fill="rgba(201,123,75,0.07)" />
        <circle cx="25" cy="5" r="0.5" fill="rgba(201,123,75,0.04)" />
      </>,
    },
    electric: {
      w: 24, h: 24,
      children: <>
        <circle cx="12" cy="12" r="1" fill="rgba(99,102,241,0.15)" />
        <circle cx="0" cy="0" r="0.5" fill="rgba(99,102,241,0.08)" />
        <circle cx="24" cy="0" r="0.5" fill="rgba(99,102,241,0.08)" />
        <circle cx="0" cy="24" r="0.5" fill="rgba(99,102,241,0.08)" />
        <circle cx="24" cy="24" r="0.5" fill="rgba(99,102,241,0.08)" />
      </>,
    },
    noir_pro: { w: 20, h: 20, children: <line x1="0" y1="20" x2="20" y2="0" stroke="rgba(201,168,76,0.09)" strokeWidth="0.75" /> },
  };
  const def = defs[preset] ?? defs.warm!;
  const id = `mkp-${preset}`;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={id} x="0" y="0" width={def.w} height={def.h} patternUnits="userSpaceOnUse">
            {def.children}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}

export function MediaKitClient({
  creator,
  links,
  platformStats,
  enabledPlatformIds,
  workSamples,
  rates,
  brands,
  sectionVisibility: initialSectionVisibility,
  appearance: appearanceProp,
  instagramConnected = true,
  isDemoKit = false,
  kitId,
  inquiryEnabled = false,
  isOwner = false,
}: MediaKitClientProps) {
  const sectionVisibility = initialSectionVisibility ?? DEFAULT_SECTION_VISIBILITY;
  const showConnectInstagramOverlay = !isDemoKit && !instagramConnected;
  const appearance = appearanceProp ?? DEFAULT_KIT_APPEARANCE;
  const preset: KitAppearancePreset = appearance.preset ?? "warm";
  const chartColors = kitChartColors(preset);

  const primaryPlatform =
    enabledPlatformIds.find((id) => platformStats[id]?.growthDataPoints?.length) ?? enabledPlatformIds[0];

  const rawGrowth =
    primaryPlatform && platformStats[primaryPlatform]?.growthDataPoints?.length
      ? platformStats[primaryPlatform].growthDataPoints!
      : [];

  const followersForChart =
    primaryPlatform && platformStats[primaryPlatform]
      ? platformStats[primaryPlatform].followers
      : enabledPlatformIds[0]
        ? (platformStats[enabledPlatformIds[0]]?.followers ?? 0)
        : 0;

  const growthData =
    rawGrowth.length > 0
      ? rawGrowth
      : (isDemoKit || instagramConnected) && followersForChart > 0
        ? buildSyntheticGrowthFromFollowers(followersForChart)
        : [];

  const audiencePlatform =
    enabledPlatformIds.find((id) => platformStats[id]?.audienceDemographics?.length) ?? primaryPlatform;
  const audience =
    audiencePlatform && platformStats[audiencePlatform]?.audienceDemographics?.length
      ? platformStats[audiencePlatform].audienceDemographics!
      : [];

  return (
    <div
      className="relative min-h-screen bg-[var(--mk-bg)] text-[var(--mk-text)] antialiased"
      style={kitAppearanceToCssVarsWithOverrides(appearance)}
      data-kit-preset={preset}
    >
      <PatternLayer preset={preset} />
      {/* Single unified header — owner gets dark bar with edit controls, visitors get themed bar */}
      {isOwner ? (
        <header className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between bg-[#111110] border-b border-white/[0.06] px-6 sm:px-10 h-14 text-[#fafaf9]">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {appearance.logoUrl ? (
              <img src={appearance.logoUrl} alt="Brand logo" className="h-5 w-auto object-contain brightness-0 invert" />
            ) : (
              <span className="text-sm font-medium text-[#fafaf9]/70 tracking-wide">Preview</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/kit/edit?id=${kitId ?? ""}`}
              className="text-xs font-medium text-[#fafaf9]/60 hover:text-[#fafaf9] transition-colors"
            >
              Edit kit
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#fafaf9]/10 px-3 py-1 text-xs font-medium text-[#fafaf9] hover:bg-[#fafaf9]/15 transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
        </header>
      ) : (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-[var(--mk-bg)] border-b border-[var(--mk-border-hairline)] px-6 sm:px-10 h-14">
          {appearance.logoUrl ? (
            <img src={appearance.logoUrl} alt="Brand logo" className="h-6 w-auto object-contain" />
          ) : (
            <span className="font-display text-sm tracking-wide text-[var(--mk-text-muted)] font-medium">
              Media Kit Pro
            </span>
          )}
          <Link
            href="/"
            className="text-xs text-[var(--mk-text-muted)] hover:text-[var(--mk-text)] transition-colors font-medium tracking-wide"
          >
            Create yours →
          </Link>
        </header>
      )}

      <main className="relative pb-24 max-w-4xl mx-auto px-5 sm:px-8 pt-14">
        <div className="pt-6 space-y-4">

          {/* 1. Hero banner — dark inverted card, avatar + name + bio */}
          <div className="rounded-2xl bg-[var(--mk-text)] px-6 py-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              {creator.avatarUrl ? (
                <img
                  src={creator.avatarUrl}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover shrink-0 ring-2 ring-[var(--mk-bg)]/20"
                  width={48} height={48}
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-[var(--mk-bg)]/10 flex items-center justify-center shrink-0">
                  <span className="font-display text-base font-semibold text-[var(--mk-bg)]/70">
                    {creator.name.charAt(0)}
                  </span>
                </div>
              )}
              <div>
                <p className="text-[var(--mk-bg)]/50 text-[11px] font-semibold tracking-[0.16em] uppercase mb-0.5">
                  Creator Media Kit
                </p>
                <h1 className="font-display text-xl font-semibold text-[var(--mk-bg)] leading-none tracking-tight">
                  {creator.name}
                </h1>
                <p className="text-[var(--mk-bg)]/50 text-xs font-medium tracking-wide mt-0.5">
                  @{creator.username}
                </p>
              </div>
            </div>
            {creator.bio && (
              <p className="mt-4 text-[var(--mk-bg)]/60 text-sm leading-relaxed font-sans max-w-2xl text-pretty border-t border-[var(--mk-bg)]/10 pt-4">
                {creator.bio}
              </p>
            )}
          </div>

          {/* 2. Platform stats — flat card with divide-x metric grid */}
          {sectionVisibility.stats && (
            <div className="rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] relative overflow-hidden">
              <div className={`grid divide-x divide-[var(--mk-border)] ${
                enabledPlatformIds.length === 1
                  ? "grid-cols-3"
                  : enabledPlatformIds.length === 2
                    ? "grid-cols-2 sm:grid-cols-6"
                    : "grid-cols-2 sm:grid-cols-3"
              }`}>
                {enabledPlatformIds.map((platformId) => {
                  const meta = getPlatformMeta(platformId);
                  const stats = platformStats[platformId];
                  if (!stats) return null;
                  const posts = stats.extra && typeof stats.extra.posts === "number" ? stats.extra.posts : null;
                  return (
                    <div key={platformId} className="contents">
                      <div className="px-5 py-5">
                        <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase mb-2">
                          {meta.displayName}
                        </p>
                        <p className="font-display text-[var(--mk-text)] text-2xl font-semibold tabular-nums">
                          <CountUp value={stats.followers} duration={1400} />
                        </p>
                        <p className="text-[var(--mk-text-soft)] text-xs mt-0.5">followers</p>
                      </div>
                      <div className="px-5 py-5">
                        <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase mb-2">Engagement</p>
                        <p className="font-display text-[var(--mk-text)] text-2xl font-semibold tabular-nums">
                          <CountUp value={stats.avgEngagement} decimals={1} suffix="%" duration={1000} />
                        </p>
                        <p className="text-[var(--mk-text-soft)] text-xs mt-0.5">avg rate</p>
                      </div>
                      {posts != null ? (
                        <div className="px-5 py-5">
                          <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase mb-2">Posts</p>
                          <p className="font-display text-[var(--mk-text)] text-2xl font-semibold tabular-nums">
                            <CountUp value={posts} duration={1100} />
                          </p>
                          <p className="text-[var(--mk-text-soft)] text-xs mt-0.5">published</p>
                        </div>
                      ) : (
                        <div className="px-5 py-5">
                          <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase mb-2">Growth</p>
                          <p className="font-display text-[var(--mk-text)] text-2xl font-semibold tabular-nums">
                            +<CountUp value={stats.growthThisMonth} decimals={1} suffix="%" duration={900} />
                          </p>
                          <p className="text-[var(--mk-text-soft)] text-xs mt-0.5">this month</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {showConnectInstagramOverlay && (
                <ConnectInstagramOverlay title="Connect Instagram to show your reach and engagement" />
              )}
            </div>
          )}

          {/* 3. Work samples — post performance rows */}
          {sectionVisibility.workSamples && workSamples.length > 0 && (
            <div className="rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-[var(--mk-border)]">
                <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase">
                  Work samples
                </p>
              </div>
              <div className="divide-y divide-[var(--mk-border)]">
                {workSamples.map((sample) => (
                  <div key={sample.id} className="flex items-start gap-4 py-4 pr-5">
                    <div className="w-[3px] self-stretch rounded-full bg-[var(--mk-text)]/20 shrink-0" />
                    {/* Thumbnail or placeholder */}
                    <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-[var(--mk-bg)] border border-[var(--mk-border)] flex items-center justify-center">
                      {sample.thumbnailUrl ? (
                        <img src={sample.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-display text-base font-semibold text-[var(--mk-text-soft)]">
                          {sample.title?.charAt(0) ?? "•"}
                        </span>
                      )}
                    </div>
                    {/* Info + metrics */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] text-[var(--mk-text-soft)] uppercase tracking-[0.14em] font-semibold">
                            {PLATFORM_LABELS[sample.platform] ?? sample.platform}
                            {sample.contentType && <span className="opacity-60 ml-1.5">· {sample.contentType}</span>}
                          </p>
                          <p className="mt-0.5 font-display font-semibold text-[var(--mk-text)] text-sm leading-snug">
                            {sample.title ?? "Campaign"}
                          </p>
                          {sample.campaignFor && (
                            <p className="text-xs text-[var(--mk-text-muted)] font-sans">{sample.campaignFor}</p>
                          )}
                        </div>
                      </div>
                      {/* Metrics inline row */}
                      {(sample.views || sample.reach || sample.likes || sample.comments || sample.saves) && (
                        <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
                          {(sample.views || sample.reach) && (
                            <div>
                              <span className="text-[10px] text-[var(--mk-text-soft)] uppercase tracking-wide mr-1">
                                {sample.views ? "Views" : "Reach"}
                              </span>
                              <span className="text-sm font-semibold text-[var(--mk-text)] tabular-nums">
                                <CountUp value={sample.views ?? sample.reach ?? 0} duration={1200} />
                              </span>
                            </div>
                          )}
                          {sample.likes && (
                            <div>
                              <span className="text-[10px] text-[var(--mk-text-soft)] uppercase tracking-wide mr-1">Likes</span>
                              <span className="text-sm font-semibold text-[var(--mk-text)] tabular-nums">
                                <CountUp value={sample.likes} duration={1100} />
                              </span>
                            </div>
                          )}
                          {sample.comments && (
                            <div>
                              <span className="text-[10px] text-[var(--mk-text-soft)] uppercase tracking-wide mr-1">Comments</span>
                              <span className="text-sm font-semibold text-[var(--mk-text)] tabular-nums">
                                <CountUp value={sample.comments} duration={1000} />
                              </span>
                            </div>
                          )}
                          {sample.saves && (
                            <div>
                              <span className="text-[10px] text-[var(--mk-text-soft)] uppercase tracking-wide mr-1">Saves</span>
                              <span className="text-sm font-semibold text-[var(--mk-text)] tabular-nums">
                                <CountUp value={sample.saves} duration={1000} />
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {!sample.views && !sample.reach && !sample.likes && sample.caption && (
                        <p className="mt-1.5 text-xs text-[var(--mk-text-soft)] font-sans">{sample.caption}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Brands — flat chips card */}
          {sectionVisibility.brands && brands.length > 0 && (
            <div className="rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] p-5">
              <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase mb-4">
                Brands I&apos;ve worked with
              </p>
              <div className="flex flex-wrap gap-2">
                {brands.map((brand) => (
                  <div key={brand.id} className="flex items-center gap-2 border border-[var(--mk-border)] rounded-full px-3.5 py-2">
                    {brand.logoUrl && (
                      <img src={brand.logoUrl} alt={brand.name} className="h-4 w-auto object-contain" />
                    )}
                    <span className="text-sm font-medium text-[var(--mk-text)]">{brand.name}</span>
                    {brand.tagline && (
                      <span className="text-xs text-[var(--mk-text-muted)]">· {brand.tagline}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Rates — inverted CTA block */}
          {sectionVisibility.rates && rates.show && (
            <div className="rounded-2xl bg-[var(--mk-text)] px-6 py-6 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[var(--mk-bg)]/50 text-[11px] font-semibold tracking-[0.16em] uppercase mb-1">Rates</p>
                <p className="font-display text-2xl font-semibold text-[var(--mk-bg)] tracking-tight">
                  {rates.fromAmount != null ? `From $${rates.fromAmount.toLocaleString()}` : "Contact for rates"}
                </p>
              </div>
              {rates.ctaLabel && (
                <a
                  href={links[0]?.url ?? "#"}
                  className="inline-flex items-center rounded-full bg-[var(--mk-bg)] text-[var(--mk-text)] px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  {rates.ctaLabel}
                </a>
              )}
            </div>
          )}

          {/* 6. Growth chart */}
          {sectionVisibility.growthChart && (
            <div className="rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-[var(--mk-border)]">
                <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase">Follower growth</p>
              </div>
              <div className="relative p-5 min-h-[260px]">
                {(isDemoKit || instagramConnected) && growthData.length > 0 ? (
                  <GrowthAreaChart data={growthData} preset={preset} stroke={chartColors.stroke} fillOpacity={chartColors.fillOpacity} />
                ) : showConnectInstagramOverlay ? (
                  <ConnectInstagramOverlay title="Connect Instagram to show follower growth" />
                ) : (isDemoKit || instagramConnected) && growthData.length === 0 ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                    <p className="text-sm text-[var(--mk-text-muted)] max-w-sm font-sans">
                      Follower data will appear here once available from Instagram.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* 7. Audience demographics */}
          {sectionVisibility.audience && (
            <div className="rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-[var(--mk-border)]">
                <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase">Audience demographics</p>
              </div>
              <div className="relative p-5 min-h-[200px]">
                {(isDemoKit || instagramConnected) && audience.length > 0 ? (
                  <AudienceBarChart data={audience} stroke={chartColors.stroke} />
                ) : showConnectInstagramOverlay ? (
                  <ConnectInstagramOverlay title="Connect Instagram to show audience demographics" />
                ) : (isDemoKit || instagramConnected) && audience.length === 0 ? (
                  <div className="flex min-h-[160px] flex-col items-center justify-center text-center">
                    <p className="font-sans text-sm text-[var(--mk-text-muted)] max-w-sm">
                      Instagram didn&apos;t return age demographics yet. This can take up to 48 hours.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* 8. Links */}
          {sectionVisibility.links && links.length > 0 && (
            <div className="rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] p-5">
              <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase mb-3">Get in touch</p>
              <div className="space-y-2">
                {links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between w-full py-3 px-5 rounded-xl bg-[var(--mk-text)] text-[var(--mk-bg)] text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    {link.label}
                    <span className="text-[var(--mk-text-soft)]">→</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 9. Brand inquiry form (Pro) */}
          {inquiryEnabled && kitId && (
            <InquiryForm kitId={kitId} creatorName={creator.name} />
          )}

          {/* 10. Footer */}
          <div className="pt-6 pb-2 text-center">
            <p className="text-xs text-[var(--mk-text-soft)] font-sans">Made with Media Kit Pro</p>
          </div>

        </div>
      </main>
    </div>
  );
}
