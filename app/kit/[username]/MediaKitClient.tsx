"use client";

import type React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { LogoMark } from "@/app/components/Logo";
import { CountUp } from "@/app/components/Skeleton";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import type { PlatformId, PlatformStatsWithCharts } from "@/lib/platforms";
import { getPlatformMeta } from "@/lib/platforms";
import { BRAND_LOGO_RATIO_CLASS, type KitRates, type BrandPartner } from "@/lib/mock-data";
import type { FetchedPost } from "@/lib/platforms/instagram";
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

const AudienceDonutChart = dynamic(
  () => import("./MediaKitRecharts").then((m) => m.AudienceDonutChart),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[180px] min-h-[180px] w-full animate-pulse rounded-lg bg-[var(--mk-border)]/25"
        aria-hidden
      />
    ),
  }
);

interface MediaKitClientProps {
  username: string;
  creator: { name: string; username: string; bio: string; avatarUrl?: string | null; verifiedTier?: string | null; niches?: string[]; location?: string | null };
  links: { label: string; url: string }[];
  platformStats: Record<string, PlatformStatsWithCharts>;
  enabledPlatformIds: PlatformId[];
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
  /** Real Instagram posts for the grid */
  instagramPosts?: FetchedPost[];
}

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
    <section className="mt-12 sm:mt-14 rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] px-6 py-10 sm:px-10">
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
      className={`absolute inset-0 bg-[var(--mk-bg)]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10 ${className}`}
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
  rates,
  brands,
  sectionVisibility: initialSectionVisibility,
  appearance: appearanceProp,
  instagramConnected = true,
  isDemoKit = false,
  kitId,
  inquiryEnabled = false,
  isOwner = false,
  instagramPosts = [],
}: MediaKitClientProps) {
  const sectionVisibility = initialSectionVisibility ?? DEFAULT_SECTION_VISIBILITY;
  const showConnectInstagramOverlay = !isDemoKit && !instagramConnected && isOwner;
  const [selectedPost, setSelectedPost] = useState<FetchedPost | null>(null);
  const [youtubeEmbedId, setYoutubeEmbedId] = useState<string | null>(null);
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

  // Only chart REAL follower history. Demo kits may show a synthetic curve (clearly a sample);
  // live kits never fabricate — no data → honest empty state.
  const growthData =
    rawGrowth.length > 0
      ? rawGrowth
      : isDemoKit && followersForChart > 0
        ? buildSyntheticGrowthFromFollowers(followersForChart)
        : [];

  const audiencePlatform =
    enabledPlatformIds.find((id) => platformStats[id]?.audienceDemographics?.length) ?? primaryPlatform;
  const audience =
    audiencePlatform && platformStats[audiencePlatform]?.audienceDemographics?.length
      ? platformStats[audiencePlatform].audienceDemographics!
      : [];

  // Charts sit side-by-side on desktop when both are present; full-width when only one.
  const showGrowthChart = sectionVisibility.growthChart && (instagramConnected || isDemoKit || isOwner);
  const showAudienceChart = sectionVisibility.audience && (instagramConnected || isDemoKit || isOwner);

  // Gender split + top countries (Instagram audience insights).
  const genderData = platformStats["instagram"]?.audienceGender ?? [];
  const countryData = platformStats["instagram"]?.audienceCountries ?? [];
  const showGender = sectionVisibility.audience && (instagramConnected || isDemoKit) && genderData.length > 0;
  const showCountries = sectionVisibility.audience && (instagramConnected || isDemoKit) && countryData.length > 0;
  const flagEmoji = (code: string) =>
    code.length === 2
      ? code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
      : "";

  // Per-post averages — derived from the recent posts we already fetched (no extra API).
  const avg = (nums: number[]) => (nums.length ? Math.round(nums.reduce((s, n) => s + n, 0) / nums.length) : null);
  const avgLikes = avg(instagramPosts.map((p) => p.likes).filter((n): n is number => typeof n === "number"));
  const avgComments = avg(instagramPosts.map((p) => p.comments).filter((n): n is number => typeof n === "number"));
  const avgReach = avg(instagramPosts.map((p) => p.reach).filter((n): n is number => typeof n === "number"));
  const perPostCells = [
    avgLikes != null && avgLikes > 0 ? { label: "Avg likes", value: avgLikes } : null,
    avgComments != null && avgComments > 0 ? { label: "Avg comments", value: avgComments } : null,
    avgReach != null && avgReach > 0 ? { label: "Avg reach", value: avgReach } : null,
  ].filter((c): c is { label: string; value: number } => c !== null);
  const showPerPost = (instagramConnected || isDemoKit) && perPostCells.length > 0;

  return (
    <div
      className="relative min-h-screen bg-[var(--mk-bg)] text-[var(--mk-text)] antialiased"
      style={kitAppearanceToCssVarsWithOverrides(appearance)}
      data-kit-preset={preset}
    >
      <PatternLayer preset={preset} />

      {/* Instagram post modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSelectedPost(null)}>
          <div className="bg-white dark:bg-[#1c1c1a] rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/*
              object-contain in a flexible box, not object-cover in aspect-square. Instagram
              posts are 1:1, 4:5 or 9:16, so a square crop silently cut the top and bottom
              off most of them — a portrait post lost the subject's head. The whole point of
              this modal is to see the post, so it must never crop.

              max-h on the image plus a scrollable body keeps a tall portrait from pushing
              the caption and stats off screen.
            */}
            {selectedPost.thumbnailUrl && (
              <div className="bg-black flex items-center justify-center shrink-0">
                <img
                  src={selectedPost.thumbnailUrl}
                  alt=""
                  className="max-h-[60vh] w-auto max-w-full object-contain"
                />
              </div>
            )}
            <div className="p-5 overflow-y-auto">
              {selectedPost.caption && (
                <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-4 line-clamp-4">{selectedPost.caption}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm mb-4">
                {selectedPost.likes != null && (
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    <span>{selectedPost.likes.toLocaleString()} likes</span>
                  </div>
                )}
                {selectedPost.comments != null && (
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span>{selectedPost.comments.toLocaleString()} comments</span>
                  </div>
                )}
                {selectedPost.saves != null && (
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                    <span>{selectedPost.saves.toLocaleString()} saves</span>
                  </div>
                )}
                {selectedPost.reach != null && (
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    <span>{selectedPost.reach.toLocaleString()} reach</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                {selectedPost.permalink ? (
                  <a href={selectedPost.permalink} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-pink-600 hover:text-pink-700 transition-colors">
                    View on Instagram
                  </a>
                ) : <span />}
                <button type="button" onClick={() => setSelectedPost(null)} className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YouTube embed modal */}
      {youtubeEmbedId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setYoutubeEmbedId(null)}>
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeEmbedId}?autoplay=1`}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title="YouTube video"
              />
            </div>
            <button type="button" onClick={() => setYoutubeEmbedId(null)} className="mt-4 mx-auto flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Close
            </button>
          </div>
        </div>
      )}
      {/* Single unified header — owner gets dark bar with edit controls, visitors get themed bar */}
      {isOwner ? (
        <header className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between bg-[#111110] border-b border-white/[0.06] px-6 sm:px-10 h-14 text-[#fafaf9]">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {/* Custom brand logo is parked — see KitEditor. Kits with a saved logoUrl fall back
                to the wordmark until the feature returns. */}
            <span className="text-sm font-medium text-[#fafaf9]/70 tracking-wide">Preview</span>
          </div>
          {/* Only the two actions you can't do from here: edit this kit, or go back.
              (Analytics lived here too, but the dashboard opens on Activity now — same place.) */}
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
              Dashboard
            </Link>
          </div>
        </header>
      ) : (
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-[var(--mk-bg)] border-b border-[var(--mk-border-hairline)] px-6 sm:px-10 h-14">
          {/* Custom brand logo is parked — see KitEditor. Always show the wordmark for now. */}
          {/*
            Mono, like the footer: this is the creator's page and it goes to brands, so the
            mark identifies without co-branding their pitch. `auto` takes currentColor, so
            it rides --mk-text-muted across all five vibes.
          */}
          <span className="font-display text-sm tracking-wide text-[var(--mk-text-muted)] font-medium inline-flex items-center gap-1.5">
            <LogoMark size={15} mono on="auto" />
            Kitevo
          </span>
          <Link
            href="/"
            className="text-xs text-[var(--mk-text-muted)] hover:text-[var(--mk-text)] transition-colors font-medium tracking-wide"
          >
            Create yours
          </Link>
        </header>
      )}

      <main className="relative pb-24 max-w-4xl mx-auto px-5 sm:px-8 pt-14">
        <div className="pt-6 space-y-4">

          {/* 1. Profile card — cover banner with the avatar overlapping it, then identity + bio.
                 The cover is built from the kit's accent so it changes with the chosen vibe. */}
          <div className="rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] overflow-hidden">
            {/* Cover — solid accent gradient, strongest at the bottom-left where the avatar sits
                 so its ring (card colour) visibly cuts the avatar out of the cover. Fading toward
                 the surface here instead would make the ring disappear. */}
            <div
              className="relative h-24 sm:h-28"
              style={{
                backgroundImage: `linear-gradient(to top right, ${chartColors.stroke}C4 0%, ${chartColors.stroke}82 50%, ${chartColors.stroke}38 100%)`,
              }}
            >
              <span className="absolute top-3 right-4 text-[10px] font-semibold tracking-[0.16em] uppercase text-[var(--mk-text)]/55">
                Creator Media Kit
              </span>
            </div>

            <div className="px-5 pb-6 sm:px-7 sm:pb-7">
              {/* Avatar — pulled up so it straddles the cover edge. `relative z-10` is required:
                  the cover above is positioned, so without a stacking context of its own the
                  cover paints over the avatar's overlapping half (and its ring). */}
              <div className="relative z-10 -mt-10 sm:-mt-12 mb-3 w-fit">
                {creator.avatarUrl ? (
                  <img
                    src={creator.avatarUrl}
                    alt=""
                    className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover ring-[5px] ring-[var(--mk-surface)] shadow-sm"
                    width={96} height={96}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full ring-[5px] ring-[var(--mk-surface)] bg-[var(--mk-border)] flex items-center justify-center">
                    <span className="font-display text-2xl font-semibold text-[var(--mk-text)]/60">
                      {creator.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Identity */}
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--mk-text)] leading-none tracking-tight truncate">
                  {creator.name}
                </h1>
                <VerifiedBadge tier={creator.verifiedTier} size="md" />
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-1.5">
                <p className="text-[var(--mk-text-muted)] text-sm font-medium">@{creator.username}</p>
                {creator.location && (
                  <>
                    <span className="text-[var(--mk-text-soft)] text-xs">·</span>
                    <p className="text-[var(--mk-text-muted)] text-sm">{creator.location}</p>
                  </>
                )}
              </div>

              {creator.bio && (
                <p className="mt-3 text-[var(--mk-text-muted)] text-sm leading-relaxed font-sans max-w-2xl text-pretty">
                  {creator.bio}
                </p>
              )}

              {(creator.niches?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {creator.niches!.slice(0, 5).map((n) => (
                    <span
                      key={n}
                      className="text-[10px] font-semibold tracking-wide uppercase rounded-full px-2.5 py-1"
                      style={{ backgroundColor: `${chartColors.stroke}1F`, color: "var(--mk-text)" }}
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Combined stats — every platform's headline numbers, up top ── */}
          {(() => {
            const ig = platformStats["instagram"];
            const yt = platformStats["youtube"];
            if (!ig && !yt) return null;

            const igIcon = (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#E1306C" aria-hidden className="shrink-0">
                <path d="M12 2.2c3.2 0 3.6 0 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.14 15.6 2.13 15.2 2.13 12s.01-3.58.07-4.85C2.35 3.92 3.87 2.4 7.12 2.27 8.4 2.2 8.8 2.2 12 2.2Zm0 3.64a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32Zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z"/>
              </svg>
            );
            const ytIcon = (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#FF0000" aria-hidden className="shrink-0">
                <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.2C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z"/>
              </svg>
            );

            type Cell = { key: string; label: string; node: React.ReactNode; icon: React.ReactNode };
            const cells: Cell[] = [];

            if (ig) {
              cells.push({ key: "ig-foll", icon: igIcon, label: "Followers", node: <CountUp value={ig.followers} duration={1400} compact /> });
              if (ig.avgEngagement > 0) cells.push({ key: "ig-eng", icon: igIcon, label: "Engagement", node: <CountUp value={ig.avgEngagement} decimals={1} suffix="%" duration={1000} /> });
              if (ig.growthThisMonth > 0) cells.push({ key: "ig-gr", icon: igIcon, label: "Growth · 30d", node: <span>+<CountUp value={ig.growthThisMonth} decimals={1} suffix="%" duration={1200} /></span> });
            }
            if (yt) {
              cells.push({ key: "yt-sub", icon: ytIcon, label: "Subscribers", node: <CountUp value={yt.followers} duration={1400} compact /> });
              const totalViews = typeof yt.extra?.totalViews === "number" ? yt.extra.totalViews : null;
              if (totalViews) cells.push({ key: "yt-views", icon: ytIcon, label: "Total views", node: <CountUp value={totalViews} duration={1600} compact /> });
              let avgViews: number | null = null;
              try {
                const vids = yt.extra?.recentVideosJson ? (JSON.parse(String(yt.extra.recentVideosJson)) as Array<{ viewCount?: number }>) : [];
                const vv = vids.map((v) => v.viewCount).filter((n): n is number => typeof n === "number");
                avgViews = vv.length ? Math.round(vv.reduce((s, n) => s + n, 0) / vv.length) : null;
              } catch { /* ignore malformed */ }
              if (avgViews && cells.filter((c) => c.key.startsWith("yt")).length < 3) {
                cells.push({ key: "yt-avg", icon: ytIcon, label: "Avg views", node: <CountUp value={avgViews} duration={1200} compact /> });
              }
            }

            const bothPlatforms = !!ig && !!yt;
            const totalAudience = (ig?.followers ?? 0) + (yt?.followers ?? 0);
            // Compact cells (number over label) let more fit per row: 3-up on mobile, all-in-one-row on desktop.
            const cols = cells.length >= 5 ? "sm:grid-cols-5" : cells.length === 4 ? "sm:grid-cols-4" : cells.length === 3 ? "sm:grid-cols-3" : cells.length === 2 ? "sm:grid-cols-2" : "";
            const liveLabel = bothPlatforms ? "Live — synced from Instagram & YouTube" : ig ? "Live — synced from Instagram" : "Live — synced from YouTube";

            // Mobile is a 6-col grid so cells can divide evenly: normally 3-up (span 2 each), and a
            // trailing row of 1 or 2 stretches to fill (span 6, or 3 each) — no leftover gaps.
            // Grid lines come from gap-px over a border-coloured background, which stays correct
            // however the cells wrap (divide-x/-y does not).
            const remainder = cells.length % 3;
            const spanFor = (i: number) => {
              const inLastRow = remainder !== 0 && i >= cells.length - remainder;
              if (!inLastRow) return "col-span-2 sm:col-span-1";
              return remainder === 1 ? "col-span-6 sm:col-span-1" : "col-span-3 sm:col-span-1";
            };
            return (
              <div>
                <div className="rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-border)] overflow-hidden">
                  {/* Total audience headline — the single number that frames everything (only when multi-platform) */}
                  {bothPlatforms && (
                    <div className="bg-[var(--mk-surface)] mb-px px-5 py-5 sm:px-6 flex items-baseline gap-x-2 gap-y-1 flex-wrap">
                      <span className="font-display text-[var(--mk-text)] text-3xl sm:text-4xl font-semibold tabular-nums leading-none tracking-tight">
                        <CountUp value={totalAudience} duration={1600} compact />
                      </span>
                      <span className="text-sm text-[var(--mk-text-muted)] font-sans">total audience across Instagram &amp; YouTube</span>
                    </div>
                  )}
                  <div className={`grid grid-cols-6 ${cols} gap-px`}>
                    {cells.map((cell, i) => (
                      <div key={cell.key} className={`bg-[var(--mk-surface)] px-2 py-4 sm:px-3 sm:py-5 text-center ${spanFor(i)}`}>
                        <p className="font-display text-[var(--mk-text)] text-xl sm:text-2xl font-semibold tabular-nums leading-none tracking-tight">{cell.node}</p>
                        <p className="text-[var(--mk-text-soft)] text-[11px] mt-1.5 flex items-center justify-center gap-1 truncate">
                          {cell.icon}{cell.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Live indicator — only claim "live" for real synced kits (not demo) */}
                {!isDemoKit && (ig || yt) && (
                  <div className="mt-2.5 flex items-center justify-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-[11px] font-medium text-[var(--mk-text-soft)] tracking-wide">{liveLabel}</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Per-post averages — typical performance a brand can expect */}
          {showPerPost && (
            <div className="rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-border)] overflow-hidden">
              <div className="bg-[var(--mk-surface)] mb-px px-5 pt-4 pb-3">
                <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase">Typical post performance</p>
              </div>
              <div className={`grid grid-cols-3 ${perPostCells.length === 3 ? "sm:grid-cols-3" : perPostCells.length === 2 ? "sm:grid-cols-2" : ""} gap-px`}>
                {perPostCells.map((cell) => (
                  <div key={cell.label} className="bg-[var(--mk-surface)] px-2 py-4 sm:px-3 sm:py-5 text-center">
                    <p className="font-display text-[var(--mk-text)] text-xl sm:text-2xl font-semibold tabular-nums leading-none tracking-tight">
                      <CountUp value={cell.value} duration={1100} compact />
                    </p>
                    <p className="text-[var(--mk-text-soft)] text-[11px] mt-1.5 truncate">{cell.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Charts — side-by-side on desktop, stacked on mobile, equal height */}
          {(showGrowthChart || showAudienceChart) && (
            <div className={`grid gap-4 items-stretch ${showGrowthChart && showAudienceChart ? "md:grid-cols-2" : ""}`}>
              {showGrowthChart && (
                <div className="flex flex-col rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] overflow-hidden">
                  <div className="px-5 pt-5 pb-3 border-b border-[var(--mk-border)]">
                    <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase">Follower growth</p>
                  </div>
                  <div className="relative flex-1 flex items-center p-5 min-h-[240px]">
                    {(isDemoKit || instagramConnected) && growthData.length > 0 ? (
                      <GrowthAreaChart data={growthData} preset={preset} stroke={chartColors.stroke} fillOpacity={chartColors.fillOpacity} />
                    ) : showConnectInstagramOverlay ? (
                      <ConnectInstagramOverlay title="Connect Instagram to show follower growth" />
                    ) : (isDemoKit || instagramConnected) && growthData.length === 0 ? (
                      <div className="flex w-full flex-col items-center justify-center text-center">
                        <p className="text-sm text-[var(--mk-text-muted)] max-w-sm font-sans">
                          Follower data will appear here once available from Instagram.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}

              {showAudienceChart && (
                <div className="flex flex-col rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] overflow-hidden">
                  <div className="px-5 pt-5 pb-3 border-b border-[var(--mk-border)]">
                    <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase">Audience age</p>
                  </div>
                  <div className="relative flex-1 flex items-center p-5 min-h-[240px]">
                    {(isDemoKit || instagramConnected) && audience.length > 0 ? (
                      <AudienceDonutChart data={audience} stroke={chartColors.stroke} />
                    ) : showConnectInstagramOverlay ? (
                      <ConnectInstagramOverlay title="Connect Instagram to show audience demographics" />
                    ) : (isDemoKit || instagramConnected) && audience.length === 0 ? (
                      <div className="flex w-full flex-col items-center justify-center text-center">
                        <p className="font-sans text-sm text-[var(--mk-text-muted)] max-w-sm">
                          Instagram didn&apos;t return age demographics yet. This can take up to 48 hours.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gender split + top countries — distinct visual styles from the charts above */}
          {(showGender || showCountries) && (
            <div className={`grid gap-4 items-stretch ${showGender && showCountries ? "md:grid-cols-2" : ""}`}>
              {/* Gender — segmented split bar */}
              {showGender && (
                <div className="flex flex-col rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] overflow-hidden">
                  <div className="px-5 pt-5 pb-3 border-b border-[var(--mk-border)]">
                    <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase">Audience gender</p>
                  </div>
                  <div className="flex-1 flex flex-col justify-center p-5">
                    <div className="flex h-4 w-full rounded-full overflow-hidden">
                      {genderData.map((g, i) => (
                        <div
                          key={g.gender}
                          style={{ width: `${g.pct}%`, backgroundColor: chartColors.stroke, opacity: [1, 0.55, 0.3][i] ?? 0.3 }}
                          title={`${g.gender} ${g.pct}%`}
                        />
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                      {genderData.map((g, i) => (
                        <div key={g.gender} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: chartColors.stroke, opacity: [1, 0.55, 0.3][i] ?? 0.3 }} />
                          <span className="text-sm text-[var(--mk-text)]">{g.gender}</span>
                          <span className="text-sm font-semibold tabular-nums text-[var(--mk-text-soft)]">{g.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Top countries — ranked flag + progress bar */}
              {showCountries && (
                <div className="flex flex-col rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] overflow-hidden">
                  <div className="px-5 pt-5 pb-3 border-b border-[var(--mk-border)]">
                    <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase">Top locations</p>
                  </div>
                  <div className="flex-1 flex flex-col justify-center p-5 space-y-3">
                    {countryData.map((c) => {
                      const max = countryData[0]?.pct || 1;
                      return (
                        <div key={c.code} className="flex items-center gap-2.5 sm:gap-3">
                          <span className="text-base leading-none w-5 text-center shrink-0" aria-hidden>{flagEmoji(c.code)}</span>
                          <span className="text-sm text-[var(--mk-text)] w-20 sm:w-28 truncate shrink-0">{c.country}</span>
                          <div className="flex-1 min-w-[40px] h-2 rounded-full bg-[var(--mk-border)] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(c.pct / max) * 100}%`, backgroundColor: chartColors.stroke }} />
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-[var(--mk-text-soft)] w-11 text-right shrink-0">{c.pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Instagram Section ── */}
          {(instagramConnected || isDemoKit) && (
            <div className="rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] overflow-hidden relative">
              {/* Header */}
              <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-[var(--mk-border)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="url(#ig-sec-grad)" aria-hidden="true">
                  <defs>
                    <linearGradient id="ig-sec-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f09433"/>
                      <stop offset="50%" stopColor="#dc2743"/>
                      <stop offset="100%" stopColor="#bc1888"/>
                    </linearGradient>
                  </defs>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span className="font-display text-[var(--mk-text)] text-base font-semibold">Recent posts</span>
              </div>
              {/* 9:16 posts grid — one row */}
              {instagramPosts.length > 0 ? (
                <div className="grid grid-cols-3 gap-[2px] p-[2px]">
                  {instagramPosts.filter((p) => p.thumbnailUrl).slice(0, 3).map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setSelectedPost(post)}
                      className="group relative overflow-hidden bg-[var(--mk-border)]"
                      style={{ aspectRatio: "9/16" }}
                    >
                      {post.thumbnailUrl && (
                        <img src={post.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                        <div className="flex items-center gap-2">
                          {post.likes != null && (
                            <span className="flex items-center gap-1 text-white text-[10px] font-semibold">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="white" aria-hidden><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                              {post.likes >= 1000 ? `${(post.likes / 1000).toFixed(1)}k` : post.likes}
                            </span>
                          )}
                          {post.comments != null && (
                            <span className="flex items-center gap-1 text-white text-[10px] font-semibold">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" aria-hidden><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                              {post.comments}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Type badge */}
                      <div className="absolute top-2 right-2">
                        {post.mediaType === "VIDEO" && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="white" className="drop-shadow" aria-hidden><path d="M8 5v14l11-7z"/></svg>
                        )}
                        {post.mediaType === "CAROUSEL_ALBUM" && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="drop-shadow" aria-hidden><rect x="2" y="7" width="15" height="15" rx="2"/><path d="M17 2h2a2 2 0 0 1 2 2v2"/></svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : showConnectInstagramOverlay ? (
                <div className="min-h-[200px] relative">
                  <ConnectInstagramOverlay title="Connect Instagram to show your posts" />
                </div>
              ) : null}
              {/* See more — link to the IG profile (falls back to a post permalink if the handle is unknown) */}
              {(() => {
                const igHandle = platformStats["instagram"]?.extra?.username;
                const profileUrl = typeof igHandle === "string" && igHandle
                  ? `https://instagram.com/${igHandle}`
                  : instagramPosts.find((p) => p.permalink)?.permalink;
                if (!profileUrl) return null;
                return (
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-5 py-3.5 border-t border-[var(--mk-border)] text-sm font-medium text-[var(--mk-text-muted)] hover:text-[var(--mk-text)] transition-colors"
                  >
                    See more on Instagram
                    <span aria-hidden></span>
                  </a>
                );
              })()}
            </div>
          )}

          {/* ── YouTube Section ── */}
          {enabledPlatformIds.includes("youtube" as import("@/lib/platforms/types").PlatformId) && (() => {
            const ytStats = platformStats["youtube"];
            if (!ytStats) return null;
            const videoCount = ytStats.extra && typeof ytStats.extra.videoCount === "number" ? ytStats.extra.videoCount : null;
            const totalViews = ytStats.extra && typeof ytStats.extra.totalViews === "number" ? ytStats.extra.totalViews : null;
            const videosJson = ytStats.extra?.recentVideosJson as string | undefined;
            const videos = videosJson ? JSON.parse(videosJson) as Array<{ id: string; title: string; thumbnailUrl: string; viewCount: number; likeCount: number }> : [];
            return (
              <div className="rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] overflow-hidden">
                {/* Header */}
                <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-[var(--mk-border)]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#FF0000" aria-hidden="true">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <span className="font-display text-[var(--mk-text)] text-base font-semibold">YouTube</span>
                </div>
                {/* Stats row */}
                <div className="grid grid-cols-3 divide-x divide-[var(--mk-border)] border-b border-[var(--mk-border)]">
                  <div className="px-5 py-4">
                    <p className="text-[var(--mk-text-soft)] text-[10px] font-semibold tracking-[0.14em] uppercase mb-1">Subscribers</p>
                    <p className="font-display text-[var(--mk-text)] text-xl font-semibold tabular-nums"><CountUp value={ytStats.followers} duration={1400} /></p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[var(--mk-text-soft)] text-[10px] font-semibold tracking-[0.14em] uppercase mb-1">Total Views</p>
                    <p className="font-display text-[var(--mk-text)] text-xl font-semibold tabular-nums">{totalViews != null ? <CountUp value={totalViews} duration={1200} /> : "—"}</p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-[var(--mk-text-soft)] text-[10px] font-semibold tracking-[0.14em] uppercase mb-1">Videos</p>
                    <p className="font-display text-[var(--mk-text)] text-xl font-semibold tabular-nums">{videoCount != null ? <CountUp value={videoCount} duration={1100} /> : "—"}</p>
                  </div>
                </div>
                {/* Video grid — 16:9 */}
                {videos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-[2px] p-[2px]">
                    {videos.map((video) => (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => setYoutubeEmbedId(video.id)}
                        className="group relative overflow-hidden bg-black"
                        style={{ aspectRatio: "16/9" }}
                      >
                        {video.thumbnailUrl && (
                          <img src={video.thumbnailUrl} alt={video.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-90 group-hover:opacity-70" />
                        )}
                        {/* Play button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-10 w-10 rounded-full bg-black/50 group-hover:bg-black/70 border border-white/30 flex items-center justify-center transition-all duration-200 group-hover:scale-110">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden><path d="M8 5v14l11-7z"/></svg>
                          </div>
                        </div>
                        {/* Title + stats on hover */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                          <p className="text-white text-[10px] font-medium line-clamp-2 leading-snug">{video.title}</p>
                          <p className="text-white/60 text-[9px] mt-0.5">{video.viewCount.toLocaleString()} views</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* No platforms connected — prompt to connect (owner only, non-demo) */}
          {!isDemoKit && !instagramConnected && !enabledPlatformIds.includes("youtube" as import("@/lib/platforms/types").PlatformId) && isOwner && (
            <div className="rounded-2xl border border-dashed border-[var(--mk-border)] bg-[var(--mk-surface)] p-6 text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--mk-text-soft)]" aria-hidden><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p className="text-[var(--mk-text)] text-sm font-semibold">No platforms connected yet</p>
              </div>
              <p className="text-[var(--mk-text-soft)] text-xs leading-relaxed max-w-xs mx-auto">
                Connect Instagram or YouTube from your dashboard to show live stats, posts, and videos on this kit.
              </p>
              <a
                href="/dashboard"
                className="inline-flex h-8 items-center rounded-full bg-[var(--mk-text)] px-4 text-xs font-medium text-[var(--mk-bg)] hover:opacity-80 transition-opacity"
              >
                Go to dashboard
              </a>
            </div>
          )}

          {/* 4. Brands — flat chips card */}
          {sectionVisibility.brands && brands.length > 0 && (
            <div className="rounded-2xl border border-[var(--mk-border)] bg-[var(--mk-surface)] p-5">
              <p className="text-[var(--mk-text-soft)] text-[11px] font-semibold tracking-[0.16em] uppercase mb-4">
                Brands I&apos;ve worked with
              </p>
              {/* Logo wall: uniform cell height with object-contain keeps every logo at its own
                  aspect ratio. Logos sit on a light chip so dark marks stay legible on dark vibes. */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--mk-border)] bg-[var(--mk-bg-elevated)] px-3 py-4 text-center"
                    title={brand.tagline ? `${brand.name} · ${brand.tagline}` : brand.name}
                  >
                    {brand.logoUrl ? (
                      /* Frame follows the ratio the creator picked for their image, so a wide
                         wordmark isn't letterboxed into a square (and vice versa). */
                      /* min-h-0: flex items default to min-height:auto, which lets the image's
                         content height override the frame's aspect-ratio. */
                      <span
                        className={`flex w-full min-h-0 items-center justify-center overflow-hidden rounded-md bg-white/95 p-2 ${
                          BRAND_LOGO_RATIO_CLASS[brand.logoRatio ?? "auto"]
                        }`}
                      >
                        <img
                          src={brand.logoUrl}
                          alt={brand.name}
                          className="max-h-full max-w-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </span>
                    ) : (
                      <span className="flex h-12 items-center text-sm font-semibold text-[var(--mk-text)]">
                        {brand.name}
                      </span>
                    )}
                    {brand.tagline && (
                      <span className="text-[11px] leading-snug text-[var(--mk-text-muted)] line-clamp-2">
                        {brand.tagline}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Rates — parked for now ──
              Also removes the "Get in touch" CTA, which pointed at links[0] and silently did
              nothing (href="#") whenever the creator had no links set. Rates data still
              round-trips; re-enable here and in KitEditor, and give the CTA a real target
              (the inquiry form) before bringing it back.
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
          */}


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
                    <span className="text-[var(--mk-text-soft)]"></span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 9. Brand inquiry form (Pro) */}
          {inquiryEnabled && kitId && (
            <InquiryForm kitId={kitId} creatorName={creator.name} />
          )}

          {/* 10. Footer — links home so every shared kit is an acquisition channel */}
          <div className="pt-6 pb-2 text-center">
            <Link
              href="/"
              className="text-xs text-[var(--mk-text-soft)] font-sans hover:text-[var(--mk-text)] transition-colors inline-flex items-center gap-1.5"
            >
              {/*
                Mono, not the colour overprint: this page belongs to the creator and gets
                sent to brands. A tri-colour mark here would co-brand their pitch. `auto`
                takes currentColor, so it rides --mk-text-soft and the hover transition
                across every kit vibe.
              */}
              <LogoMark size={14} mono on="auto" />
              Made with <span className="font-semibold">Kitevo</span>. Create your own media kit
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
