"use client";

import type React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { LogoMark } from "@/app/components/Logo";
import { CountUp } from "@/app/components/Skeleton";
import { VerifiedBadge } from "@/app/components/VerifiedBadge";
import type { PlatformId, PlatformStatsWithCharts } from "@/lib/platforms";
import { BRAND_LOGO_RATIO_CLASS, type KitRates, type BrandPartner } from "@/lib/mock-data";
import { formatUsd, hasPublicRates, publicRateItems } from "@/lib/kit-rates";
import type { FetchedPost } from "@/lib/platforms/instagram";
import { DEFAULT_SECTION_VISIBILITY, type SectionVisibility } from "@/lib/kit-storage";
import type { KitAppearance, KitAppearancePreset } from "@/lib/kit-appearance";
import { DEFAULT_KIT_APPEARANCE, kitAppearanceToCssVarsWithOverrides, kitChartColors } from "@/lib/kit-appearance";
import { audienceSummary, compactNumber, firstName } from "@/lib/kit-audience-summary";
import type { PublicProduct } from "@/lib/commerce-shared";

const GrowthAreaChart = dynamic(
  () => import("./MediaKitRecharts").then((m) => m.GrowthAreaChart),
  {
    ssr: false,
    loading: () => <div className="h-52 min-h-[208px] w-full rounded-lg bg-[var(--mk-border)]/25" aria-hidden />,
  }
);

interface MediaKitClientProps {
  username: string;
  /** Kit owner's referral code, appended to the "Create yours" links. */
  referralCode?: string | null;
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
  /** Where the headline stats came from. Manual numbers must never be labelled "live". */
  statsSource?: "live" | "manual" | "mixed" | "none";
  /** Kit DB id — required for inquiry form submissions */
  kitId?: string;
  /** When true, show the brand inquiry form (Pro feature) */
  inquiryEnabled?: boolean;
  /** When true, the logged-in user owns this kit — show dashboard nav bar */
  isOwner?: boolean;
  /** Real Instagram posts for the grid */
  instagramPosts?: FetchedPost[];
  /**
   * Rendered inside the editor's phone preview rather than as the page: no screen-height
   * minimum and phone padding on the header (its breakpoints follow the window, not the kit).
   */
  embedded?: boolean;
  /** Published products for the Shop section (lib/commerce). */
  products?: PublicProduct[];
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
  const first = firstName(creatorName);

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
    "w-full rounded-xl border border-[var(--mk-border)] bg-[var(--mk-bg)] px-4 py-3 font-sans text-sm text-[var(--mk-text)] placeholder:text-[var(--mk-text-soft)] transition focus:outline-none focus:ring-2 focus:ring-[var(--mk-text)]/30";

  return (
    <div id="work-together" className="scroll-mt-20 rounded-2xl bg-[var(--mk-surface)] p-5 @min-[640px]:p-7">
      <h3 className="font-display text-xl font-semibold tracking-tight text-[var(--mk-text)]">Send {first} a brief</h3>
      <p className="mt-1 max-w-md font-sans text-sm text-[var(--mk-text-muted)]">
        Say what you have in mind, and {first} will reply by email.
      </p>
      {status === "sent" ? (
        <div className="mt-6 rounded-xl border border-[var(--mk-border)] px-6 py-8 text-center">
          <p className="font-display text-xl font-semibold text-[var(--mk-text)]">Message sent</p>
          <p className="mt-1 font-sans text-sm text-[var(--mk-text-muted)]">{first} has your message and will reply to {email || "your email"}.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <div className="grid grid-cols-1 gap-3 @min-[640px]:grid-cols-2">
            <input type="text" aria-label="Your name" placeholder="Your name" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            <input type="email" aria-label="Your email" placeholder="Your email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <input type="text" aria-label="Company or brand" placeholder="Company or brand (optional)" value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} />
          <textarea aria-label="Message" placeholder="What's the campaign, and when?" required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} className={inputCls + " resize-none"} />
          {status === "error" && <p className="font-sans text-sm text-red-600">The message didn&apos;t send. Check your connection and try again.</p>}
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-full bg-[var(--mk-text)] py-3.5 font-sans text-sm font-semibold text-[var(--mk-bg)] transition-opacity hover:opacity-90 disabled:opacity-60 @min-[640px]:w-auto @min-[640px]:px-8"
          >
            {status === "sending" ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </div>
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

const IG_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="#E1306C" aria-hidden className="shrink-0">
    <path d="M12 2.2c3.2 0 3.6 0 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92C2.14 15.6 2.13 15.2 2.13 12s.01-3.58.07-4.85C2.35 3.92 3.87 2.4 7.12 2.27 8.4 2.2 8.8 2.2 12 2.2Zm0 3.64a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32Zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88Z"/>
  </svg>
);
const YT_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="#FF0000" aria-hidden className="shrink-0">
    <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.2C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z"/>
  </svg>
);

/**
 * What each part of the kit is, for the editor's preview: hovering or tapping an element with
 * data-kit-section opens the matching part of the editor (app/kit/edit).
 */
export type KitSectionKind = "profile" | "numbers" | "audience" | "posts" | "youtube" | "growth" | "brands" | "products" | "rates" | "contact";

/** A titled block of the kit. No card: sections are separated by space and a hairline. */
function Section({ title, icon, children, id, kind }: { title: string; icon?: React.ReactNode; children: React.ReactNode; id?: string; kind: KitSectionKind }) {
  return (
    <section id={id} data-kit-section={kind} className="scroll-mt-20 border-t border-[var(--mk-border-hairline)] pt-8 @min-[640px]:pt-10">
      <h2 className="mb-5 flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-[var(--mk-text)] @min-[640px]:text-2xl">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Small heading inside a section (Age, Gender, Top countries). */
function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 font-sans text-sm font-medium text-[var(--mk-text-muted)]">{children}</h3>;
}

/** The rate card: the kit's one coloured surface, in the style's accent. */
function RateCard({ rates, ctaTarget, ctaLabel }: { rates: KitRates; ctaTarget: string | null; ctaLabel: string }) {
  const items = publicRateItems(rates);
  return (
    <div data-kit-section="rates" className="rounded-2xl bg-[var(--mk-rates-bg)] p-5 text-[var(--mk-rates-text)] @min-[640px]:p-6">
      <p className="font-display text-lg font-semibold tracking-tight">Rates</p>
      {items.length > 0 ? (
        <ul className="mt-3 divide-y divide-[var(--mk-rates-muted)]/30">
          {items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-4 py-2.5">
              <span className="min-w-0 font-sans text-sm">{item.label}</span>
              <span className="shrink-0 font-sans text-base font-semibold tabular-nums">{formatUsd(item.price)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 font-display text-3xl font-semibold tracking-tight">From {formatUsd(rates.fromAmount as number)}</p>
      )}
      {items.length > 0 && typeof rates.fromAmount === "number" && (
        <p className="mt-2 font-sans text-xs text-[var(--mk-rates-muted)]">Packages from {formatUsd(rates.fromAmount)}.</p>
      )}
      {ctaTarget && (
        <a
          href={ctaTarget}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[var(--mk-rates-text)] px-6 py-3 font-sans text-sm font-semibold text-[var(--mk-rates-bg)] transition-opacity hover:opacity-90"
        >
          {ctaLabel}
        </a>
      )}
    </div>
  );
}

const flagEmoji = (code: string) =>
  code.length === 2 ? code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)) : "";

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
  statsSource = "live",
  kitId,
  inquiryEnabled = false,
  isOwner = false,
  embedded = false,
  instagramPosts = [],
  referralCode = null,
  products = [],
}: MediaKitClientProps) {
  // Footer/header "Create yours" links credit the kit owner as the referrer.
  const homeHref = referralCode ? `/?ref=${encodeURIComponent(referralCode)}` : "/";
  const sectionVisibility = initialSectionVisibility ?? DEFAULT_SECTION_VISIBILITY;
  const showConnectInstagramOverlay = !isDemoKit && !instagramConnected && isOwner;
  const [selectedPost, setSelectedPost] = useState<FetchedPost | null>(null);
  const [youtubeEmbedId, setYoutubeEmbedId] = useState<string | null>(null);
  const appearance = appearanceProp ?? DEFAULT_KIT_APPEARANCE;
  const preset: KitAppearancePreset = appearance.preset ?? "warm";
  const chartColors = kitChartColors(preset);
  const first = firstName(creator.name);

  const ig = platformStats["instagram"];
  const yt = platformStats["youtube"];
  const measured = instagramConnected || isDemoKit;

  // ── Growth (real history only; demo kits may show a sample curve) ──
  const primaryPlatform = enabledPlatformIds.find((id) => platformStats[id]?.growthDataPoints?.length) ?? enabledPlatformIds[0];
  const rawGrowth = primaryPlatform && platformStats[primaryPlatform]?.growthDataPoints?.length ? platformStats[primaryPlatform].growthDataPoints! : [];
  const followersForChart = primaryPlatform && platformStats[primaryPlatform] ? platformStats[primaryPlatform].followers : 0;
  const growthData = rawGrowth.length > 0 ? rawGrowth : isDemoKit && followersForChart > 0 ? buildSyntheticGrowthFromFollowers(followersForChart) : [];

  // ── Audience (measured only — manual stats never become charts) ──
  const audiencePlatform = enabledPlatformIds.find((id) => platformStats[id]?.audienceDemographics?.length) ?? primaryPlatform;
  const ageData = audiencePlatform && platformStats[audiencePlatform]?.audienceDemographics?.length ? platformStats[audiencePlatform].audienceDemographics! : [];
  const genderData = ig?.audienceGender ?? [];
  const countryData = ig?.audienceCountries ?? [];
  const audienceAllowed = sectionVisibility.audience && statsSource !== "manual";
  const showAge = audienceAllowed && measured && ageData.length > 0;
  const showGender = audienceAllowed && measured && genderData.length > 0;
  const showCountries = audienceAllowed && measured && countryData.length > 0;
  const showAudienceSection = showAge || showGender || showCountries || (audienceAllowed && showConnectInstagramOverlay);
  const showGrowthChart = sectionVisibility.growthChart && statsSource !== "manual" && (measured || isOwner);

  // ── YouTube numbers ──
  let ytVideos: Array<{ id: string; title: string; thumbnailUrl: string; viewCount: number; likeCount: number }> = [];
  try {
    ytVideos = yt?.extra?.recentVideosJson ? JSON.parse(String(yt.extra.recentVideosJson)) : [];
  } catch {
    ytVideos = [];
  }
  const ytAvgViews = ytVideos.length ? Math.round(ytVideos.reduce((s, v) => s + (v.viewCount ?? 0), 0) / ytVideos.length) : null;
  const ytTotalViews = typeof yt?.extra?.totalViews === "number" ? yt.extra.totalViews : null;
  const ytVideoCount = typeof yt?.extra?.videoCount === "number" ? yt.extra.videoCount : null;

  // ── Per-post averages from the posts we already have ──
  const avg = (nums: number[]) => (nums.length ? Math.round(nums.reduce((s, n) => s + n, 0) / nums.length) : null);
  const perPost = [
    { label: "likes per post", one: "like per post", value: avg(instagramPosts.map((p) => p.likes).filter((n): n is number => typeof n === "number")) },
    { label: "comments per post", one: "comment per post", value: avg(instagramPosts.map((p) => p.comments).filter((n): n is number => typeof n === "number")) },
    { label: "reach per post", one: "reach per post", value: avg(instagramPosts.map((p) => p.reach).filter((n): n is number => typeof n === "number")) },
  ].filter((c): c is { label: string; one: string; value: number } => c.value != null && c.value > 0);
  const showPerPost = sectionVisibility.stats && measured && perPost.length > 0;

  // ── Headline stat strip ──
  type Stat = { key: string; label: string; icon: React.ReactNode; node: React.ReactNode };
  const stats: Stat[] = [];
  if (sectionVisibility.stats) {
    if (ig) {
      stats.push({ key: "ig-f", icon: IG_ICON, label: "Followers", node: <CountUp value={ig.followers} duration={1200} compact /> });
      if (ig.avgEngagement > 0) stats.push({ key: "ig-e", icon: IG_ICON, label: "Engagement", node: <CountUp value={ig.avgEngagement} decimals={1} suffix="%" duration={1000} /> });
      if (ig.growthThisMonth > 0) stats.push({ key: "ig-g", icon: IG_ICON, label: "30-day growth", node: <span>+<CountUp value={ig.growthThisMonth} decimals={1} suffix="%" duration={1000} /></span> });
    }
    if (yt) {
      stats.push({ key: "yt-s", icon: YT_ICON, label: "Subscribers", node: <CountUp value={yt.followers} duration={1200} compact /> });
      if (ytAvgViews) stats.push({ key: "yt-a", icon: YT_ICON, label: "Views per video", node: <CountUp value={ytAvgViews} duration={1000} compact /> });
      else if (ytTotalViews) stats.push({ key: "yt-t", icon: YT_ICON, label: "Total views", node: <CountUp value={ytTotalViews} duration={1000} compact /> });
    }
  }
  const sourceLabel =
    statsSource === "manual"
      ? "Self-reported by creator"
      : statsSource === "mixed"
        ? "Live where connected, other numbers self-reported"
        : `Live, synced from ${ig && yt ? "Instagram and YouTube" : ig ? "Instagram" : "YouTube"}`;

  // ── The headline paragraph (real data only) ──
  const summary = sectionVisibility.stats
    ? audienceSummary({
        name: creator.name,
        selfReported: statsSource === "manual",
        instagram: ig ? { followers: ig.followers, engagement: ig.avgEngagement } : null,
        youtube: yt ? { subscribers: yt.followers, avgViews: ytAvgViews } : null,
        gender: showGender ? genderData : [],
        age: showAge ? ageData : [],
        countries: showCountries ? countryData : [],
      })
    : [];

  // ── Call to action: inquiry form (Pro) → links → nothing. Never a dead link. ──
  const ctaTarget = inquiryEnabled && kitId ? "#work-together" : sectionVisibility.links && links.length > 0 ? "#contact" : null;
  const ctaLabel = rates.ctaLabel || `Work with ${first}`;
  const showRates = sectionVisibility.rates && hasPublicRates(rates);
  const rateItems = showRates ? publicRateItems(rates) : [];
  const fromPrice = showRates
    ? Math.min(...[...rateItems.map((i) => i.price as number), ...(typeof rates.fromAmount === "number" ? [rates.fromAmount] : [])])
    : null;
  const showContact = ctaTarget !== null;

  // The sticky bar steps aside once the contact section is on screen.
  const root = useRef<HTMLDivElement>(null);
  const [contactInView, setContactInView] = useState(false);
  useEffect(() => {
    const el = root.current?.querySelector("#contact-area");
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setContactInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [showContact]);

  const igProfileUrl = (() => {
    const handle = ig?.extra?.username;
    return typeof handle === "string" && handle ? `https://instagram.com/${handle}` : instagramPosts.find((p) => p.permalink)?.permalink;
  })();
  const postsToShow = instagramPosts.filter((p) => p.thumbnailUrl).slice(0, 3);
  /** Recent posts + YouTube videos ("workSamples" in section visibility). */
  const showWork = sectionVisibility.workSamples !== false;

  return (
    <div
      ref={root}
      className={`relative ${embedded ? "min-h-full" : "min-h-screen"} bg-[var(--mk-bg)] text-[var(--mk-text)] antialiased`}
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
        <header className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-[var(--mk-bg)] border-b border-[var(--mk-border-hairline)] px-6 h-14 ${embedded ? "" : "sm:px-10"}`}>
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
            href={homeHref}
            className="text-xs text-[var(--mk-text-muted)] hover:text-[var(--mk-text)] transition-colors font-medium tracking-wide"
          >
            Create yours
          </Link>
        </header>
      )}

      {/* Query container: the kit lays out for the width it's given (the window on the public
          page, a phone-sized box in the editor preview). Header and modals stay outside:
          container-type applies layout containment, which would anchor position:fixed here. */}
      <div className="@container">
        <main className="relative mx-auto max-w-6xl px-5 pt-14 @min-[640px]:px-8">
          <div className="pt-8 @min-[1024px]:grid @min-[1024px]:grid-cols-[300px_minmax(0,1fr)] @min-[1024px]:gap-14 @min-[1024px]:pt-12">
            {/* ── Identity rail: sticky on wide screens so price + contact stay in view ── */}
            <aside data-kit-section="profile" className="@min-[1024px]:sticky @min-[1024px]:top-20 @min-[1024px]:self-start">
              <div className="flex items-center gap-4 @min-[1024px]:block">
                {creator.avatarUrl ? (
                  <img
                    src={creator.avatarUrl}
                    alt=""
                    width={96}
                    height={96}
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 shrink-0 rounded-full object-cover @min-[640px]:h-20 @min-[640px]:w-20 @min-[1024px]:h-24 @min-[1024px]:w-24"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--mk-border)] @min-[640px]:h-20 @min-[640px]:w-20 @min-[1024px]:h-24 @min-[1024px]:w-24">
                    <span className="font-display text-2xl font-semibold text-[var(--mk-text)]/60">{creator.name.charAt(0)}</span>
                  </div>
                )}
                <div className="min-w-0 @min-[1024px]:mt-5">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate font-display text-2xl font-semibold leading-tight tracking-tight text-[var(--mk-text)] @min-[640px]:text-3xl">
                      {creator.name}
                    </h1>
                    <VerifiedBadge tier={creator.verifiedTier} size="md" />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-sm text-[var(--mk-text-muted)]">
                    <span>@{creator.username}</span>
                    {creator.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={13} aria-hidden className="text-[var(--mk-text-soft)]" />
                        {creator.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {(creator.niches?.length ?? 0) > 0 && (
                <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Content niches">
                  {creator.niches!.slice(0, 5).map((n) => (
                    <li
                      key={n}
                      className="rounded-full px-2.5 py-1 font-sans text-xs font-medium text-[var(--mk-text)]"
                      style={{ backgroundColor: `${chartColors.stroke}1A` }}
                    >
                      {n}
                    </li>
                  ))}
                </ul>
              )}

              {creator.bio && (
                <p className="mt-4 max-w-xl text-pretty font-sans text-[15px] leading-relaxed text-[var(--mk-text-muted)]">{creator.bio}</p>
              )}

              {/* Wide screens: rates + the main action live in the rail */}
              <div className="mt-8 hidden space-y-3 @min-[1024px]:block">
                {showRates ? (
                  <RateCard rates={rates} ctaTarget={ctaTarget} ctaLabel={ctaLabel} />
                ) : ctaTarget ? (
                  <a
                    href={ctaTarget}
                    className="inline-flex w-full items-center justify-center rounded-full bg-[var(--mk-text)] px-6 py-3 font-sans text-sm font-semibold text-[var(--mk-bg)] transition-opacity hover:opacity-90"
                  >
                    {ctaLabel}
                  </a>
                ) : null}
              </div>
            </aside>

            {/* ── The case for working together ── */}
            {/* The first block never gets a divider above it (sections draw a top hairline). */}
            <div className="min-w-0 space-y-10 pb-16 pt-8 @min-[640px]:space-y-12 @min-[1024px]:pt-0 [&>section:first-child]:border-t-0 [&>section:first-child]:pt-0 [&>div:first-child>section:first-child]:border-t-0 [&>div:first-child>section:first-child]:pt-0 @min-[1024px]:[&>[data-rates-mobile]:first-child+div>section]:border-t-0 @min-[1024px]:[&>[data-rates-mobile]:first-child+div>section]:pt-0">
              {(summary.length > 0 || stats.length > 0) && (
                <div data-kit-section="numbers">
                  {summary.length > 0 && (
                    <p className="max-w-[34ch] text-balance font-display text-[clamp(1.5rem,5.2cqw,2.6rem)] font-normal leading-[1.18] tracking-tight text-[var(--mk-text)] @min-[1024px]:text-[clamp(1.8rem,3.4cqw,2.6rem)]">
                      {summary.map((sentence, i) => (
                        <span key={i}>
                          {i > 0 && " "}
                          {sentence.map((seg, j) =>
                            seg.strong ? (
                              <strong key={j} className="font-semibold">{seg.text}</strong>
                            ) : (
                              <span key={j} className={i > 0 ? "text-[var(--mk-text-muted)]" : undefined}>{seg.text}</span>
                            ),
                          )}
                        </span>
                      ))}
                    </p>
                  )}

                  {stats.length > 0 && (
                    <dl
                      className={`mt-8 grid gap-x-4 gap-y-6 border-t border-[var(--mk-border-hairline)] pt-6 @min-[640px]:gap-x-6 ${
                        stats.length === 3 ? "grid-cols-3" : stats.length === 1 ? "grid-cols-1" : "grid-cols-2"
                      } ${stats.length >= 4 ? "@min-[640px]:grid-cols-4" : ""}`}
                    >
                      {stats.map((s) => (
                        <div key={s.key} className="min-w-0">
                          <dd className="font-sans text-[26px] font-semibold leading-none tracking-tight tabular-nums text-[var(--mk-text)] @min-[640px]:text-4xl">{s.node}</dd>
                          <dt className="mt-2 flex items-center gap-1.5 font-sans text-xs text-[var(--mk-text-muted)]">
                            {s.icon}
                            {s.label}
                          </dt>
                        </div>
                      ))}
                    </dl>
                  )}

                  {showPerPost && (
                    <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 font-sans text-sm">
                      {perPost.map((c) => (
                        <div key={c.label} className="flex items-baseline gap-1.5">
                          <dd className="font-semibold tabular-nums text-[var(--mk-text)]">{compactNumber(c.value)}</dd>
                          <dt className="text-[var(--mk-text-muted)]">{c.value === 1 ? c.one : c.label}</dt>
                        </div>
                      ))}
                    </dl>
                  )}

                  {!isDemoKit && (ig || yt) && sectionVisibility.stats && (
                    <p className="mt-4 flex items-center gap-2 font-sans text-xs text-[var(--mk-text-soft)]">
                      <span className={`h-1.5 w-1.5 rounded-full ${statsSource === "manual" ? "bg-[var(--mk-text-soft)]" : "bg-emerald-500"}`} aria-hidden />
                      {sourceLabel}
                    </p>
                  )}
                </div>
              )}

              {/* Owner-only: nothing connected yet */}
              {!isDemoKit && !instagramConnected && !yt && isOwner && (
                <div className="rounded-2xl border border-dashed border-[var(--mk-border)] p-6 text-center">
                  <p className="font-sans text-sm font-semibold text-[var(--mk-text)]">No platforms connected yet</p>
                  <p className="mx-auto mt-1 max-w-xs font-sans text-xs leading-relaxed text-[var(--mk-text-soft)]">
                    Connect Instagram or YouTube from your dashboard to show live stats, posts and videos here.
                  </p>
                  <Link href="/dashboard" className="mt-4 inline-flex h-8 items-center rounded-full bg-[var(--mk-text)] px-4 font-sans text-xs font-medium text-[var(--mk-bg)] transition-opacity hover:opacity-80">
                    Go to dashboard
                  </Link>
                </div>
              )}

              {/* ── Audience ── */}
              {showAudienceSection && (
                <Section title="Audience" kind="audience">
                  {showAge || showGender || showCountries ? (
                    <div className="grid gap-8 @min-[768px]:grid-cols-2 @min-[768px]:gap-10">
                      {(showAge || showGender) && (
                        <div className="space-y-8">
                          {showAge && (
                            <div>
                              <SubHeading>Age</SubHeading>
                              <ul className="space-y-2.5">
                                {[...ageData].sort((a, b) => b.pct - a.pct).map((a) => {
                                  const max = Math.max(...ageData.map((x) => x.pct)) || 1;
                                  return (
                                    <li key={a.age} className="grid grid-cols-[3.5rem_minmax(0,1fr)_3rem] items-center gap-3 font-sans text-sm">
                                      <span className="text-[var(--mk-text)]">{a.age.replace(/-/g, "–")}</span>
                                      <span className="h-2 overflow-hidden rounded-full bg-[var(--mk-border)]">
                                        <span className="block h-full rounded-full" style={{ width: `${(a.pct / max) * 100}%`, backgroundColor: chartColors.stroke }} />
                                      </span>
                                      <span className="text-right font-semibold tabular-nums text-[var(--mk-text-muted)]">{Math.round(a.pct)}%</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                          {showGender && (
                            <div>
                              <SubHeading>Gender</SubHeading>
                              <div className="flex h-2 w-full overflow-hidden rounded-full">
                                {genderData.map((g, i) => (
                                  <div key={g.gender} style={{ width: `${g.pct}%`, backgroundColor: chartColors.stroke, opacity: [1, 0.5, 0.25][i] ?? 0.25 }} />
                                ))}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 font-sans text-sm">
                                {genderData.map((g, i) => (
                                  <span key={g.gender} className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartColors.stroke, opacity: [1, 0.5, 0.25][i] ?? 0.25 }} aria-hidden />
                                    <span className="text-[var(--mk-text)]">{g.gender}</span>
                                    <span className="font-semibold tabular-nums text-[var(--mk-text-muted)]">{g.pct}%</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {showCountries && (
                        <div>
                          <SubHeading>Top countries</SubHeading>
                          <ul className="space-y-2.5">
                            {countryData.map((c) => {
                              const max = countryData[0]?.pct || 1;
                              return (
                                <li key={c.code} className="grid grid-cols-[1.25rem_minmax(0,7rem)_minmax(0,1fr)_3rem] items-center gap-3 font-sans text-sm">
                                  <span className="text-base leading-none" aria-hidden>{flagEmoji(c.code)}</span>
                                  <span className="truncate text-[var(--mk-text)]">{c.country}</span>
                                  <span className="h-2 overflow-hidden rounded-full bg-[var(--mk-border)]">
                                    <span className="block h-full rounded-full" style={{ width: `${(c.pct / max) * 100}%`, backgroundColor: chartColors.stroke }} />
                                  </span>
                                  <span className="text-right font-semibold tabular-nums text-[var(--mk-text-muted)]">{c.pct}%</span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative min-h-[200px] overflow-hidden rounded-2xl">
                      <ConnectInstagramOverlay title="Connect Instagram to show who your audience is" />
                    </div>
                  )}
                </Section>
              )}

              {/* ── Recent posts ── */}
              {showWork && measured && (postsToShow.length > 0 || showConnectInstagramOverlay) && (
                <Section title="Recent posts" icon={IG_ICON} kind="posts">
                  {postsToShow.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {postsToShow.map((post) => (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => setSelectedPost(post)}
                          aria-label={post.caption ? `Open post: ${post.caption.slice(0, 60)}` : "Open post"}
                          className="group relative overflow-hidden rounded-xl bg-[var(--mk-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mk-text)]"
                          style={{ aspectRatio: "4/5" }}
                        >
                          <img src={post.thumbnailUrl!} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                          {post.likes != null && (
                            <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 font-sans text-[11px] font-semibold text-white backdrop-blur-sm">
                              {compactNumber(post.likes)} likes
                            </span>
                          )}
                          {post.mediaType === "VIDEO" && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white" className="absolute right-2 top-2 drop-shadow" aria-hidden><path d="M8 5v14l11-7z"/></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="relative min-h-[200px] overflow-hidden rounded-2xl">
                      <ConnectInstagramOverlay title="Connect Instagram to show your posts" />
                    </div>
                  )}
                  {igProfileUrl && postsToShow.length > 0 && (
                    <a href={igProfileUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1 font-sans text-sm font-medium text-[var(--mk-text-muted)] transition-colors hover:text-[var(--mk-text)]">
                      More on Instagram <ArrowUpRight size={14} aria-hidden />
                    </a>
                  )}
                </Section>
              )}

              {/* ── YouTube ── */}
              {showWork && yt && enabledPlatformIds.includes("youtube" as PlatformId) && (
                <Section title="YouTube" icon={YT_ICON} kind="youtube">
                  <dl className="mb-5 flex flex-wrap gap-x-8 gap-y-2 font-sans text-sm">
                    <div className="flex items-baseline gap-1.5"><dd className="font-semibold tabular-nums">{compactNumber(yt.followers)}</dd><dt className="text-[var(--mk-text-muted)]">subscribers</dt></div>
                    {ytTotalViews != null && <div className="flex items-baseline gap-1.5"><dd className="font-semibold tabular-nums">{compactNumber(ytTotalViews)}</dd><dt className="text-[var(--mk-text-muted)]">total views</dt></div>}
                    {ytVideoCount != null && <div className="flex items-baseline gap-1.5"><dd className="font-semibold tabular-nums">{ytVideoCount.toLocaleString()}</dd><dt className="text-[var(--mk-text-muted)]">videos</dt></div>}
                  </dl>
                  {ytVideos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 @min-[640px]:grid-cols-3">
                      {ytVideos.map((video) => (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() => setYoutubeEmbedId(video.id)}
                          className="group text-left focus-visible:outline-none"
                        >
                          <span className="relative block overflow-hidden rounded-xl bg-black group-focus-visible:ring-2 group-focus-visible:ring-[var(--mk-text)]" style={{ aspectRatio: "16/9" }}>
                            {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />}
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="white" aria-hidden><path d="M8 5v14l11-7z"/></svg>
                              </span>
                            </span>
                          </span>
                          <span className="mt-2 line-clamp-2 block font-sans text-xs font-medium leading-snug text-[var(--mk-text)]">{video.title}</span>
                          <span className="mt-0.5 block font-sans text-[11px] text-[var(--mk-text-soft)]">{compactNumber(video.viewCount)} views</span>
                        </button>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {/* ── Growth ── */}
              {showGrowthChart && (growthData.length > 0 || showConnectInstagramOverlay || measured) && (
                <Section title="Follower growth" kind="growth">
                  <div className="relative min-h-[220px]">
                    {measured && growthData.length > 0 ? (
                      <GrowthAreaChart data={growthData} preset={preset} stroke={chartColors.stroke} fillOpacity={chartColors.fillOpacity} />
                    ) : showConnectInstagramOverlay ? (
                      <ConnectInstagramOverlay title="Connect Instagram to show follower growth" />
                    ) : (
                      <p className="font-sans text-sm text-[var(--mk-text-muted)]">Follower history appears here after a week of data from Instagram.</p>
                    )}
                  </div>
                </Section>
              )}

              {/* ── Brands ── */}
              {sectionVisibility.brands && brands.length > 0 && (
                <Section title="Brands I've worked with" kind="brands">
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-6 @min-[640px]:grid-cols-3 @min-[1024px]:grid-cols-4">
                    {brands.map((brand) => (
                      <li key={brand.id} className="min-w-0">
                        {brand.logoUrl ? (
                          <span className={`flex h-14 items-center justify-center overflow-hidden rounded-xl bg-white/95 p-2.5 ${BRAND_LOGO_RATIO_CLASS[brand.logoRatio ?? "auto"]}`}>
                            <img src={brand.logoUrl} alt={brand.name} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                          </span>
                        ) : (
                          <span className="block font-display text-lg font-semibold leading-tight text-[var(--mk-text)]">{brand.name}</span>
                        )}
                        {brand.tagline && <span className="mt-1.5 block font-sans text-xs leading-snug text-[var(--mk-text-muted)]">{brand.tagline}</span>}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* ── Shop: the creator's published products (free downloads today) ── */}
              {sectionVisibility.products !== false && products.length > 0 && (
                <Section title="Shop" kind="products">
                  <ul className="grid grid-cols-1 gap-4 @min-[640px]:grid-cols-2 @min-[1024px]:grid-cols-3">
                    {products.map((p) => (
                      <li key={p.id}>
                        <a
                          href={`/p/${p.id}`}
                          className="group flex h-full flex-col overflow-hidden rounded-2xl bg-[var(--mk-surface)] transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mk-text)]"
                        >
                          {p.coverUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- base64 cover
                            <img src={p.coverUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                          ) : (
                            <span className="flex aspect-[4/3] w-full items-end p-4" style={{ backgroundColor: `${chartColors.stroke}1A` }} aria-hidden>
                              <span className="font-display text-4xl font-semibold text-[var(--mk-text)]/70">{(p.title || "?").charAt(0)}</span>
                            </span>
                          )}
                          <span className="flex flex-1 flex-col p-4">
                            <span className="font-display text-lg font-semibold leading-snug text-[var(--mk-text)]">{p.title}</span>
                            {p.description && <span className="mt-1 line-clamp-2 font-sans text-sm leading-relaxed text-[var(--mk-text-muted)]">{p.description}</span>}
                            <span className="mt-auto flex items-center justify-between gap-3 pt-4 font-sans text-sm">
                              <span className="font-semibold text-[var(--mk-text)]">{p.priceCents === 0 ? "Free" : formatUsd(p.priceCents / 100)}</span>
                              <span className="text-[var(--mk-text-muted)] transition-colors group-hover:text-[var(--mk-text)]">
                                {p.priceCents === 0 ? "Get it" : "Buy"} <span aria-hidden>→</span>
                              </span>
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {/* ── Rates (narrow screens; wide screens show them in the rail) ── */}
              {showRates && (
                <div data-rates-mobile className="@min-[1024px]:hidden">
                  <RateCard rates={rates} ctaTarget={ctaTarget} ctaLabel={ctaLabel} />
                </div>
              )}

              {/* ── Contact ── */}
              {showContact && (
                <div id="contact-area" className="space-y-6">
                  <Section title={`Work with ${first}`} id="contact" kind="contact">
                    {sectionVisibility.links && links.length > 0 && (
                      <ul className="divide-y divide-[var(--mk-border-hairline)] overflow-hidden rounded-2xl border border-[var(--mk-border)]">
                        {links.map((link, i) => (
                          <li key={i}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-3 bg-[var(--mk-surface)] px-5 py-4 font-sans text-sm font-medium text-[var(--mk-text)] transition-colors hover:bg-[var(--mk-bg-elevated)]"
                            >
                              <span className="min-w-0 truncate">{link.label}</span>
                              <ArrowUpRight size={16} aria-hidden className="shrink-0 text-[var(--mk-text-soft)]" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                    {inquiryEnabled && kitId && (
                      <div className={sectionVisibility.links && links.length > 0 ? "mt-6" : ""}>
                        <InquiryForm kitId={kitId} creatorName={creator.name} />
                      </div>
                    )}
                  </Section>
                </div>
              )}

              {/* Footer: every shared kit links home (the acquisition loop) */}
              <div className="pt-4 text-center @min-[1024px]:text-left">
                <Link
                  href={homeHref}
                  className="inline-flex items-center gap-1.5 font-sans text-xs text-[var(--mk-text-soft)] transition-colors hover:text-[var(--mk-text)]"
                >
                  {/* Mono, not the colour overprint: this page is the creator's pitch. */}
                  <LogoMark size={14} mono on="auto" />
                  Made with <span className="font-semibold">Kitevo</span>. Create your own media kit
                </Link>
              </div>
            </div>
          </div>

          {/* Sticky "Work with me" bar (narrow screens). Sticky, not fixed: the @container
              above contains fixed elements, and sticky also works inside the editor preview. */}
          {ctaTarget && (
            <div
              className={`sticky bottom-0 z-40 -mx-5 px-5 pb-[max(env(safe-area-inset-bottom),14px)] pt-6 transition-opacity duration-200 motion-reduce:transition-none @min-[640px]:-mx-8 @min-[640px]:px-8 @min-[1024px]:hidden ${
                contactInView ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
              style={{ backgroundImage: "linear-gradient(to top, var(--mk-bg) 55%, transparent)" }}
              aria-hidden={contactInView || undefined}
            >
              <a
                href={ctaTarget}
                tabIndex={contactInView ? -1 : undefined}
                className="flex items-center justify-between gap-3 rounded-full bg-[var(--mk-text)] py-2 pl-5 pr-2 text-[var(--mk-bg)] shadow-lg transition-opacity hover:opacity-95"
              >
                <span className="min-w-0 truncate font-sans text-sm">
                  {fromPrice != null && Number.isFinite(fromPrice) ? (
                    <>
                      From <strong className="font-semibold">{formatUsd(fromPrice)}</strong>
                    </>
                  ) : (
                    <>Open to collabs</>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-[var(--mk-bg)] px-4 py-2 font-sans text-sm font-semibold text-[var(--mk-text)]">{ctaLabel}</span>
              </a>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
