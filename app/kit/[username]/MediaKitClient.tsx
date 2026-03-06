"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { PlatformId, PlatformStatsWithCharts } from "@/lib/platforms";
import { getPlatformMeta } from "@/lib/platforms";
import type { WorkSample, KitRates, BrandPartner } from "@/lib/mock-data";
import { DEFAULT_SECTION_VISIBILITY, type SectionVisibility } from "@/lib/kit-storage";

interface MediaKitClientProps {
  username: string;
  creator: { name: string; username: string; bio: string };
  links: { label: string; url: string }[];
  platformStats: Record<string, PlatformStatsWithCharts>;
  enabledPlatformIds: PlatformId[];
  workSamples: WorkSample[];
  rates: KitRates;
  brands: BrandPartner[];
  sectionVisibility?: SectionVisibility;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export function MediaKitClient({
  creator,
  links,
  platformStats,
  enabledPlatformIds,
  workSamples,
  rates,
  brands,
  sectionVisibility: initialSectionVisibility,
}: MediaKitClientProps) {
  const sectionVisibility = initialSectionVisibility ?? DEFAULT_SECTION_VISIBILITY;

  const firstPlatformWithCharts = enabledPlatformIds.find(
    (id) => platformStats[id]?.growthDataPoints?.length
  );
  const growthData = firstPlatformWithCharts
    ? platformStats[firstPlatformWithCharts].growthDataPoints!
    : [];
  const audience =
    firstPlatformWithCharts && platformStats[firstPlatformWithCharts].audienceDemographics
      ? platformStats[firstPlatformWithCharts].audienceDemographics!
      : [];

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* Minimal header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-5 sm:px-8 pt-[calc(1rem+env(safe-area-inset-top))] pb-4 flex items-center justify-between bg-[#FAF9F7]/95 backdrop-blur-md border-b border-[#E8E6E3]">
        <span className="text-xs uppercase tracking-widest text-[#8C8C8C] font-medium">
          Media Kit Pro
        </span>
        <Link
          href="/"
          className="text-xs text-[#5C5C5C] hover:text-[#1A1A1A] transition-colors"
        >
          Create yours
        </Link>
      </header>

      <main className="pt-[calc(5rem+env(safe-area-inset-top))] pb-20 max-w-2xl mx-auto px-5 sm:px-8">
        {/* 1. Hero — agency portfolio feel, plenty of space */}
        <section className="text-center pt-8 pb-16 sm:pt-12 sm:pb-20">
          <div className="w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-full bg-gradient-to-br from-[#E8E6E3] to-[#D4D4D4] flex items-center justify-center text-3xl sm:text-4xl font-display font-semibold text-[#5C5C5C]">
            {creator.name.charAt(0)}
          </div>
          <h1 className="mt-8 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-[#1A1A1A]">
            {creator.name}
          </h1>
          <p className="mt-2 text-[#8C8C8C] text-sm">@{creator.username}</p>
          <p className="mt-6 text-[#5C5C5C] text-base sm:text-lg leading-relaxed max-w-md mx-auto">
            {creator.bio}
          </p>
        </section>

        {/* 2. Stats — clean cards */}
        {sectionVisibility.stats && (
        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-[#8C8C8C] font-medium">
            Reach & engagement
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {enabledPlatformIds.map((platformId) => {
              const meta = getPlatformMeta(platformId);
              const stats = platformStats[platformId];
              if (!stats) return null;
              return (
                <div
                  key={platformId}
                  className="p-6 rounded-lg bg-white border border-[#E8E6E3]"
                >
                  <p className="text-xs uppercase tracking-wider text-[#8C8C8C]">
                    {meta.displayName}
                  </p>
                  <p className="mt-3 font-display text-3xl font-semibold text-[#1A1A1A]">
                    {stats.followers.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-green-600">
                    +{stats.growthThisMonth}% this month
                  </p>
                  <p className="mt-1 text-sm text-[#5C5C5C]">
                    {stats.avgEngagement}% avg. engagement
                  </p>
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* 3. Work samples — proof of work, grid */}
        {sectionVisibility.workSamples && workSamples.length > 0 && (
          <section className="mt-20 sm:mt-24">
            <h2 className="text-xs uppercase tracking-widest text-[#8C8C8C] font-medium">
              Work samples
            </h2>
            <p className="mt-2 text-[#5C5C5C] text-sm max-w-md">
              Recent campaigns and content for brands.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {workSamples.map((sample) => (
                <article
                  key={sample.id}
                  className="group rounded-lg overflow-hidden bg-white border border-[#E8E6E3]"
                >
                  {/* Placeholder thumbnail: gradient when no image */}
                  <div className="aspect-[4/5] bg-gradient-to-br from-[#E8E6E3] to-[#D4D4D4] flex items-center justify-center">
                    {sample.thumbnailUrl ? (
                      <img
                        src={sample.thumbnailUrl}
                        alt={sample.title ?? ""}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-display font-semibold text-[#A3A3A3]">
                        {sample.title?.charAt(0) ?? "•"}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs uppercase tracking-wider text-[#8C8C8C]">
                      {PLATFORM_LABELS[sample.platform] ?? sample.platform}
                    </p>
                    <p className="mt-1 font-display font-semibold text-[#1A1A1A]">
                      {sample.title ?? "Campaign"}
                    </p>
                    {sample.campaignFor && (
                      <p className="mt-0.5 text-sm text-[#5C5C5C]">
                        {sample.campaignFor}
                      </p>
                    )}
                    {sample.caption && (
                      <p className="mt-1 text-xs text-[#8C8C8C]">{sample.caption}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* 4. Rates — minimal block */}
        {sectionVisibility.rates && rates.show && (
          <section className="mt-20 sm:mt-24 py-8 px-6 rounded-lg bg-white border border-[#E8E6E3] text-center">
            <h2 className="text-xs uppercase tracking-widest text-[#8C8C8C] font-medium">
              Rates
            </h2>
            <p className="mt-3 font-display text-2xl sm:text-3xl font-semibold text-[#1A1A1A]">
              {rates.fromAmount != null
                ? `From $${rates.fromAmount.toLocaleString()}`
                : "Contact for rates"}
            </p>
            {rates.ctaLabel && (
              <a
                href={links[0]?.url ?? "#"}
                className="mt-4 inline-block px-6 py-3 bg-[#1A1A1A] text-white text-sm font-medium rounded-sm hover:bg-[#2D2D2D] transition-colors"
              >
                {rates.ctaLabel}
              </a>
            )}
          </section>
        )}

        {/* 5. Brands / case studies — past partners */}
        {sectionVisibility.brands && brands.length > 0 && (
          <section className="mt-20 sm:mt-24">
            <h2 className="text-xs uppercase tracking-widest text-[#8C8C8C] font-medium">
              Brands I’ve worked with
            </h2>
            <div className="mt-6 flex flex-wrap gap-6 sm:gap-8 items-center">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className="flex flex-col items-center sm:items-start gap-1"
                >
                  {brand.logoUrl ? (
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="h-10 w-auto object-contain opacity-80"
                    />
                  ) : (
                    <span className="font-display font-semibold text-[#1A1A1A] text-lg">
                      {brand.name}
                    </span>
                  )}
                  {brand.tagline && (
                    <span className="text-xs text-[#8C8C8C]">{brand.tagline}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. Growth chart — refine visuals */}
        {sectionVisibility.growthChart && growthData.length > 0 && (
          <section className="mt-20 sm:mt-24">
            <h2 className="text-xs uppercase tracking-widest text-[#8C8C8C] font-medium">
              Follower growth
            </h2>
            <div className="mt-6 p-6 rounded-lg bg-white border border-[#E8E6E3]">
              <div className="h-52 min-h-[208px] w-full">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 208 }}>
                  <AreaChart data={growthData}>
                    <defs>
                      <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1A1A1A" stopOpacity={0.15} />
                        <stop offset="100%" stopColor="#1A1A1A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#8C8C8C" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#8C8C8C" }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1A1A1A",
                        border: "none",
                        borderRadius: 4,
                        color: "#fff",
                        fontSize: 12,
                      }}
                      formatter={(value: number | undefined) => [
                        value != null ? `${value.toLocaleString()} followers` : "",
                        "Followers",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="followers"
                      stroke="#1A1A1A"
                      strokeWidth={2}
                      fill="url(#growthGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* 7. Audience demographics */}
        {sectionVisibility.audience && audience.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xs uppercase tracking-widest text-[#8C8C8C] font-medium">
              Audience demographics
            </h2>
            <div className="mt-6 p-6 rounded-lg bg-white border border-[#E8E6E3]">
              <div className="h-40 min-h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 160 }}>
                  <BarChart data={audience} layout="vertical" margin={{ left: 0 }}>
                    <XAxis
                      type="number"
                      domain={[0, 50]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#8C8C8C" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="age"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#1A1A1A" }}
                      width={50}
                    />
                    <Bar
                      dataKey="pct"
                      fill="#1A1A1A"
                      radius={[0, 2, 2, 0]}
                      barSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1A1A1A",
                        border: "none",
                        borderRadius: 4,
                        color: "#fff",
                        fontSize: 12,
                      }}
                      formatter={(value: number | undefined) => [
                        value != null ? `${value}%` : "",
                        "Audience",
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* 8. Links — clear CTAs (only when there are links) */}
        {sectionVisibility.links && links.length > 0 && (
        <section className="mt-20 sm:mt-24 space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-[#8C8C8C] font-medium">
            Get in touch
          </h2>
          <div className="space-y-3">
            {links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-4 px-5 rounded-lg bg-white border border-[#E8E6E3] text-[#1A1A1A] font-medium text-center hover:border-[#1A1A1A] hover:bg-[#FAFAFA] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>
        )}

        {/* 9. Footer — minimal */}
        <footer className="mt-20 pt-8 border-t border-[#E8E6E3] text-center">
          <p className="text-xs text-[#8C8C8C]">
            Made with Media Kit Pro
          </p>
        </footer>
      </main>
    </div>
  );
}
