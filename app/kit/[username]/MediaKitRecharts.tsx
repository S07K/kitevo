"use client";

/**
 * Recharts-only chunk — loaded with `next/dynamic` + `ssr: false` so Webpack/Next
 * doesn’t try to execute problematic module factories during SSR (fixes
 * `Cannot read properties of undefined (reading 'call')` on /kit/* in dev).
 */

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

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
