"use client";

/**
 * Recharts-only chunk — loaded with `next/dynamic` + `ssr: false` so Webpack/Next
 * doesn’t try to execute problematic module factories during SSR (fixes
 * `Cannot read properties of undefined (reading 'call')` on /kit/* in dev).
 */

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { AudienceBucket } from "@/lib/platforms/types";

/** Monochrome shades of the theme accent, largest bracket = most opaque. */
const DONUT_SHADES = [1, 0.78, 0.6, 0.45, 0.33, 0.24];

export type GrowthPoint = { month: string; followers: number };

function formatFollowersAxisTick(v: number): string {
  if (!Number.isFinite(v)) return "";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1000) return `${(v / 1000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return Math.round(v).toLocaleString();
}

function GrowthChartTooltipContent({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: unknown;
  payload?: ReadonlyArray<{
    value?: number;
    payload?: { month?: string; followers?: number };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const point = row?.payload;
  const followers =
    typeof row?.value === "number"
      ? row.value
      : typeof point?.followers === "number"
        ? point.followers
        : null;
  const month =
    (typeof point?.month === "string" ? point.month : null) ??
    (label != null ? String(label) : "");
  return (
    <div
      className="rounded-md px-3 py-2 text-xs text-white shadow-lg"
      style={{ backgroundColor: "#1A1A1A" }}
    >
      <p className="font-semibold">{month}</p>
      {followers != null && (
        <p className="mt-1 text-white/90">{followers.toLocaleString()} followers</p>
      )}
    </div>
  );
}

function AudienceDemographicsTooltipContent({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: unknown;
  payload?: ReadonlyArray<{
    value?: number;
    payload?: { age?: string; pct?: number };
  }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const point = row?.payload;
  const pct =
    typeof row?.value === "number"
      ? row.value
      : typeof point?.pct === "number"
        ? point.pct
        : null;
  const ageRange =
    (typeof point?.age === "string" ? point.age : null) ??
    (label != null ? String(label) : "");
  return (
    <div
      className="rounded-md px-3 py-2 text-xs text-white shadow-lg"
      style={{ backgroundColor: "#1A1A1A" }}
    >
      {pct != null && <p className="font-semibold">{pct}% of audience</p>}
      {ageRange && <p className="mt-1 text-white/90">Age {ageRange}</p>}
    </div>
  );
}

export function GrowthAreaChart({
  data,
  preset,
  stroke,
  fillOpacity,
}: {
  data: GrowthPoint[];
  preset: string;
  stroke: string;
  fillOpacity: number;
}) {
  const gradId = `growthGradient-${preset}`;
  return (
    <div className="h-52 min-h-[208px] w-full">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 208 }}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={fillOpacity} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--mk-text-muted)" }}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--mk-text-muted)" }}
            tickFormatter={(v) => formatFollowersAxisTick(Number(v))}
          />
          <Tooltip content={GrowthChartTooltipContent} filterNull={false} />
          <Area
            type="monotone"
            dataKey="followers"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradId})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AudienceDonutChart({ data, stroke }: { data: AudienceBucket[]; stroke: string }) {
  // Slices ordered by share so the donut and legend read largest-first.
  const sorted = [...data].sort((a, b) => b.pct - a.pct);
  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 h-full">
      <div className="h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 180, height: 180 }}>
          <PieChart>
            <Pie
              data={sorted}
              dataKey="pct"
              nameKey="age"
              innerRadius={52}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {sorted.map((_, i) => (
                <Cell key={i} fill={stroke} fillOpacity={DONUT_SHADES[i % DONUT_SHADES.length]} />
              ))}
            </Pie>
            <Tooltip content={AudienceDemographicsTooltipContent} filterNull={false} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 w-full space-y-2">
        {sorted.map((d, i) => (
          <li key={d.age} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-[var(--mk-text)]">
              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: stroke, opacity: DONUT_SHADES[i % DONUT_SHADES.length] }} />
              Age {d.age}
            </span>
            <span className="tabular-nums font-semibold text-[var(--mk-text-soft)]">{d.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AudienceBarChart({ data, stroke }: { data: AudienceBucket[]; stroke: string }) {
  return (
    <div className="h-40 min-h-[160px] w-full">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 400, height: 160 }}>
        <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
          <XAxis
            type="number"
            domain={[0, "dataMax"]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--mk-text-soft)" }}
            tickFormatter={(n) => `${n}%`}
          />
          <YAxis
            type="category"
            dataKey="age"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--mk-text)" }}
            width={50}
          />
          <Bar dataKey="pct" fill={stroke} radius={[0, 2, 2, 0]} barSize={12} />
          <Tooltip content={AudienceDemographicsTooltipContent} filterNull={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
