"use client";

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
    "w-full px-4 py-3 rounded-xl border border-[var(--mk-border)] bg-[var(--mk-surface)] text-[var(--mk-text)] placeholder:text-[var(--mk-text-soft)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--mk-accent)] font-sans transition";

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
            className="w-full py-3.5 bg-[var(--mk-accent)] text-[var(--mk-accent-contrast)] font-semibold text-sm rounded-full hover:opacity-90 transition-opacity disabled:opacity-60 font-sans"
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
        className="mt-5 px-6 py-3 bg-[var(--mk-accent)] text-[var(--mk-accent-contrast)] text-sm font-semibold rounded-full hover:opacity-90 transition-opacity"
      >
        Go to Dashboard
      </Link>
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
      className="min-h-screen bg-[var(--mk-bg)] text-[var(--mk-text)] antialiased"
      style={kitAppearanceToCssVarsWithOverrides(appearance)}
      data-kit-preset={preset}
    >
      {/* Owner preview bar — only visible to the kit creator */}
      {isOwner && (
        <div className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between gap-4 bg-[#111110] px-5 py-2.5 text-[#fafaf9]">
          <div className="flex items-center gap-2 text-xs text-[#fafaf9]/70">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Preview — this is how your kit looks to brands
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/kit/edit?id=${kitId ?? ""}`}
              className="text-xs font-medium text-[#fafaf9]/70 hover:text-[#fafaf9] transition-colors"
            >
              Edit kit
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 rounded-full bg-[#fafaf9]/10 px-3 py-1 text-xs font-medium text-[#fafaf9] hover:bg-[#fafaf9]/20 transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Header — minimal, editorial */}
      <header className={`fixed left-0 right-0 z-50 px-5 sm:px-8 pb-4 flex items-center justify-between bg-[var(--mk-header-bg)] backdrop-blur-md border-b border-[var(--mk-border-hairline)] ${isOwner ? "top-[41px]" : "top-0 pt-[calc(1rem+env(safe-area-inset-top))]"}`}>
        {appearance.logoUrl ? (
          <img
            src={appearance.logoUrl}
            alt="Brand logo"
            className="h-7 w-auto object-contain"
          />
        ) : (
          <span className="font-display text-sm tracking-wide text-[var(--mk-text-muted)] font-medium">
            Media Kit Pro
          </span>
        )}
        <Link
          href="/"
          className="text-sm text-[var(--mk-text-muted)] hover:text-[var(--mk-text)] transition-colors font-medium"
        >
          Create yours →
        </Link>
      </header>

      <main className={`pb-24 max-w-2xl mx-auto px-5 sm:px-8 ${isOwner ? "pt-[calc(5rem+41px)]" : "pt-[calc(5rem+env(safe-area-inset-top))]"}`}>
        {/* 1. Hero — strong typography, editorial feel */}
        <section className="text-center pt-10 pb-12 sm:pt-14 sm:pb-16">
          {creator.avatarUrl ? (
            <div className="mx-auto w-32 h-32 sm:w-36 sm:h-36 rounded-full overflow-hidden ring-2 ring-[var(--mk-surface)] shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-offset-4 ring-offset-[var(--mk-bg)]">
              <img
                src={creator.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
                width={144}
                height={144}
              />
            </div>
          ) : (
            <div className="w-32 h-32 sm:w-36 sm:h-36 mx-auto rounded-full bg-gradient-to-br from-[var(--mk-border)] via-[var(--mk-bg-elevated)] to-[var(--mk-border)] flex items-center justify-center text-4xl sm:text-5xl font-display font-semibold text-[var(--mk-text-soft)] shadow-inner ring-2 ring-[var(--mk-surface)]/80 ring-offset-4 ring-offset-[var(--mk-bg)]">
              {creator.name.charAt(0)}
            </div>
          )}
          <p className="mt-8 text-[10px] uppercase tracking-[0.35em] text-[var(--mk-text-soft)] font-medium">
            Creator media kit
          </p>
          <div className="mt-6 w-12 h-px bg-[var(--mk-border)] mx-auto" aria-hidden />
          <h1 className="mt-8 font-display text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-[var(--mk-text)]">
            {creator.name}
          </h1>
          <p className="mt-3 text-[var(--mk-text-muted)] text-sm sm:text-base font-medium tracking-wide">
            @{creator.username}
          </p>
          {creator.bio ? (
            <div className="mt-10 w-full max-w-lg mx-auto px-1 sm:px-0">
              <div
                className="w-10 h-px bg-[var(--mk-border)] mx-auto opacity-80"
                aria-hidden
              />
              <p className="mt-6 text-[var(--mk-text-muted)] text-[15px] sm:text-lg leading-[1.7] font-sans text-center whitespace-pre-line text-pretty">
                {creator.bio}
              </p>
            </div>
          ) : null}
        </section>

        {/* 1b. At a glance — bridges hero and detailed stats */}
        {(sectionVisibility.stats || sectionVisibility.growthChart) && enabledPlatformIds.length > 0 && (
          <section className="mb-16 sm:mb-20 flex flex-wrap justify-center gap-x-12 gap-y-5 py-8 px-2 border-y border-[var(--mk-border-hairline)]">
            {enabledPlatformIds.map((platformId) => {
              const stats = platformStats[platformId];
              if (!stats) return null;
              const posts = stats.extra && typeof stats.extra.posts === "number" ? stats.extra.posts : null;
              return (
                <div key={platformId} className="text-center min-w-[120px]">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mk-text-soft)] font-medium">
                    {PLATFORM_LABELS[platformId] ?? platformId}
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold text-[var(--mk-text)] tracking-tight">
                    <CountUp value={stats.followers} duration={1400} />
                  </p>
                  <p className="text-xs text-[var(--mk-text-muted)] font-sans">followers</p>
                  {posts != null && (
                    <p className="mt-1.5 text-xs text-[var(--mk-text-soft)] font-sans tabular-nums">
                      <CountUp value={posts} duration={1200} /> posts
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* 2. Stats — elevated cards with accent (or Connect Instagram overlay) */}
        {sectionVisibility.stats && (
        <section className="space-y-6">
          <h2 className="font-display text-lg font-semibold text-[var(--mk-text)] tracking-tight">
            Reach & engagement
          </h2>
          <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 min-h-[180px]">
              {enabledPlatformIds.map((platformId) => {
                const meta = getPlatformMeta(platformId);
                const stats = platformStats[platformId];
                if (!stats) return null;
                return (
                  <div
                    key={platformId}
                    className="group p-6 sm:p-7 rounded-2xl bg-[var(--mk-surface)] border border-[var(--mk-border)] shadow-[0_2px_12px_rgba(26,26,26,0.04)] hover:shadow-[0_8px_24px_rgba(26,26,26,0.06)] transition-shadow duration-300"
                  >
                    <p className="text-xs uppercase tracking-widest text-[var(--mk-text-soft)] font-medium">
                      {meta.displayName}
                    </p>
                    <p className="mt-4 font-display text-3xl sm:text-4xl font-semibold text-[var(--mk-text)] tracking-tight">
                      <CountUp value={stats.followers} duration={1600} />
                    </p>
                    <p className="mt-2 text-sm font-medium text-emerald-700/90">
                      +<CountUp value={stats.growthThisMonth} decimals={1} suffix="%" duration={1000} /> this month
                    </p>
                    <p className="mt-1 text-sm text-[var(--mk-text-muted)]">
                      <CountUp value={stats.avgEngagement} decimals={1} suffix="%" duration={1000} /> avg. engagement
                    </p>
                  </div>
                );
              })}
            </div>
            {showConnectInstagramOverlay && (
              <ConnectInstagramOverlay title="Connect Instagram to show your reach and engagement" />
            )}
          </div>
        </section>
        )}

        {/* 3. Work samples — proof of work, elevated grid */}
        {sectionVisibility.workSamples && workSamples.length > 0 && (
          <section className="mt-24 sm:mt-28">
            <h2 className="font-display text-lg font-semibold text-[var(--mk-text)] tracking-tight">
              Work samples
            </h2>
            <p className="mt-2 text-[var(--mk-text-muted)] text-sm max-w-md font-sans">
              Recent campaigns and content for brands.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {workSamples.map((sample) => (
                <article
                  key={sample.id}
                  className="group rounded-2xl overflow-hidden bg-[var(--mk-surface)] border border-[var(--mk-border)] shadow-[0_2px_12px_rgba(26,26,26,0.04)] hover:shadow-[0_12px_32px_rgba(26,26,26,0.08)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className="aspect-[4/5] bg-gradient-to-br from-[var(--mk-border)] to-[var(--mk-bg-elevated)] flex items-center justify-center overflow-hidden">
                    {sample.thumbnailUrl ? (
                      <img
                        src={sample.thumbnailUrl}
                        alt={sample.title ?? ""}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                      />
                    ) : (
                      <span className="text-4xl font-display font-semibold text-[var(--mk-text-soft)]">
                        {sample.title?.charAt(0) ?? "•"}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-xs uppercase tracking-widest text-[var(--mk-text-soft)] font-medium">
                      {PLATFORM_LABELS[sample.platform] ?? sample.platform}
                    </p>
                    <p className="mt-2 font-display font-semibold text-[var(--mk-text)] text-lg">
                      {sample.title ?? "Campaign"}
                    </p>
                    {sample.campaignFor && (
                      <p className="mt-0.5 text-sm text-[var(--mk-text-muted)] font-sans">
                        {sample.campaignFor}
                      </p>
                    )}
                    {sample.caption && (
                      <p className="mt-2 text-xs text-[var(--mk-text-soft)] line-clamp-2 font-sans">{sample.caption}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 4. Rates — CTA block */}
        {sectionVisibility.rates && rates.show && (
          <section className="mt-24 sm:mt-28 py-10 px-8 rounded-2xl bg-[var(--mk-rates-bg)] text-center border border-[var(--mk-border)] shadow-[0_8px_32px_rgba(26,26,26,0.12)]">
            <h2 className="text-xs uppercase tracking-widest text-[var(--mk-rates-muted)] font-medium">
              Rates
            </h2>
            <p className="mt-4 font-display text-2xl sm:text-3xl font-semibold text-[var(--mk-rates-text)] tracking-tight">
              {rates.fromAmount != null
                ? `From $${rates.fromAmount.toLocaleString()}`
                : "Contact for rates"}
            </p>
            {rates.ctaLabel && (
              <a
                href={links[0]?.url ?? "#"}
                className="mt-6 inline-block px-8 py-3.5 bg-[var(--mk-accent-contrast)] text-[var(--mk-accent)] text-sm font-semibold rounded-full hover:opacity-90 transition-opacity"
              >
                {rates.ctaLabel}
              </a>
            )}
          </section>
        )}

        {/* 5. Brands / case studies — past partners */}
        {sectionVisibility.brands && brands.length > 0 && (
          <section className="mt-24 sm:mt-28">
            <h2 className="font-display text-lg font-semibold text-[var(--mk-text)] tracking-tight">
              Brands I've worked with
            </h2>
            <div className="mt-8 flex flex-wrap gap-8 sm:gap-10 items-center">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className="flex flex-col items-center sm:items-start gap-2"
                >
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="h-11 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <span className="font-display font-semibold text-[var(--mk-text)] text-lg">
                      {brand.name}
                    </span>
                  )}
                  {brand.tagline && (
                    <span className="text-xs text-[var(--mk-text-muted)] font-sans">{brand.tagline}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. Growth chart (or Connect Instagram overlay) */}
        {sectionVisibility.growthChart && (
          <section className="mt-24 sm:mt-28">
            <h2 className="font-display text-lg font-semibold text-[var(--mk-text)] tracking-tight">
              Follower growth
            </h2>
            <p className="mt-1 text-sm text-[var(--mk-text-muted)] font-sans max-w-md">
              Recent trajectory based on your connected account (or estimated when daily insights aren&apos;t available).
            </p>
            <div className="mt-8 relative p-6 sm:p-7 rounded-2xl bg-[var(--mk-surface)] border border-[var(--mk-border)] shadow-[0_2px_12px_rgba(26,26,26,0.04)] min-h-[280px]">
              {(isDemoKit || instagramConnected) && growthData.length > 0 ? (
                <GrowthAreaChart
                  data={growthData}
                  preset={preset}
                  stroke={chartColors.stroke}
                  fillOpacity={chartColors.fillOpacity}
                />
              ) : showConnectInstagramOverlay ? (
                <ConnectInstagramOverlay title="Connect Instagram to show follower growth" />
              ) : (isDemoKit || instagramConnected) && growthData.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center px-6 text-center">
                  <p className="text-sm text-[var(--mk-text-muted)] max-w-sm font-sans">
                    Once your account has follower data from Instagram, a growth chart will appear here.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* 7. Audience demographics (or Connect Instagram overlay) */}
        {sectionVisibility.audience && (
          <section className="mt-16">
            <h2 className="font-display text-lg font-semibold text-[var(--mk-text)] tracking-tight">
              Audience demographics
            </h2>
            <div className="mt-8 relative p-6 sm:p-7 rounded-2xl bg-[var(--mk-surface)] border border-[var(--mk-border)] shadow-[0_2px_12px_rgba(26,26,26,0.04)] min-h-[220px]">
              {(isDemoKit || instagramConnected) && audience.length > 0 ? (
                <AudienceBarChart data={audience} stroke={chartColors.stroke} />
              ) : showConnectInstagramOverlay ? (
                <ConnectInstagramOverlay title="Connect Instagram to show audience demographics" />
              ) : (isDemoKit || instagramConnected) && audience.length === 0 ? (
                <div className="flex min-h-[160px] flex-col items-center justify-center px-6 text-center">
                  <p className="font-sans text-sm text-[var(--mk-text-muted)] max-w-sm">
                    Instagram didn&apos;t return age demographics yet. Meta often requires a
                    professional account with enough followers or engagement; data can also be delayed
                    up to ~48 hours.
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* 8. Links — CTAs */}
        {sectionVisibility.links && links.length > 0 && (
        <section className="mt-24 sm:mt-28 space-y-4">
          <h2 className="font-display text-lg font-semibold text-[var(--mk-text)] tracking-tight">
            Get in touch
          </h2>
          <div className="space-y-3">
            {links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-4 px-6 rounded-2xl bg-[var(--mk-accent)] text-[var(--mk-accent-contrast)] font-semibold text-center hover:opacity-90 transition-opacity shadow-[0_2px_12px_rgba(26,26,26,0.08)]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>
        )}

        {/* 9. Brand inquiry form (Pro) */}
        {inquiryEnabled && kitId && (
          <InquiryForm kitId={kitId} creatorName={creator.name} />
        )}

        {/* 10. Footer */}
        <footer className="mt-24 sm:mt-28 pt-10 border-t border-[var(--mk-border-hairline)] text-center">
          <p className="text-sm text-[var(--mk-text-soft)] font-sans">
            Made with Media Kit Pro
          </p>
        </footer>
      </main>
    </div>
  );
}
