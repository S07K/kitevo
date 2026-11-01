"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DailyPoint { date: string; count: number; }
interface ReferrerEntry { source: string; count: number; }
interface KitEntry { id: string; name: string; slug: string; count: number; }

interface Props {
  daily: DailyPoint[];
  referrers: ReferrerEntry[];
  byKit: KitEntry[];
  total: number;
  trend: number | null;
  days: number;
  inquiryCount: number;
  wonCount: number;
  onDaysChange: (days: number) => void;
}

const RANGE_OPTIONS = [
  { label: "7d",  value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

function formatDate(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00");
  if (days <= 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function tickFormatter(value: string, index: number, days: number) {
  const every = days <= 7 ? 1 : days <= 30 ? 5 : 10;
  return index % every === 0 ? formatDate(value, days) : "";
}

function TrendBadge({ trend }: { trend: number | null }) {
  if (trend === null) return null;
  const up = trend >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-2 py-0.5 ${
      up
        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
        : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
    }`}>
      {up ? "↑" : "↓"} {Math.abs(trend)}% vs prev
    </span>
  );
}

export function AnalyticsChart({
  daily, referrers, byKit, total, trend, days,
  inquiryCount, wonCount, onDaysChange,
}: Props) {
  const [activeKitId, setActiveKitId] = useState<string | null>(null);
  const maxCount = Math.max(...daily.map((d) => d.count), 1);
  const conversionRate = total > 0 ? ((inquiryCount / total) * 100).toFixed(1) : "0";
  const winRate = inquiryCount > 0 ? ((wonCount / inquiryCount) * 100).toFixed(0) : "0";

  return (
    <div className="space-y-4">

      {/* Views chart */}
      <div className="bg-background border-border rounded-2xl border p-6">
        <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mb-1">
              Kit views
            </p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="font-display text-foreground text-2xl font-semibold tabular-nums">
                {total.toLocaleString()}
              </p>
              <TrendBadge trend={trend} />
            </div>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-full p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onDaysChange(opt.value)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  days === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={daily} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="currentColor" stopOpacity={0.15} />
                <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={(v, i) => tickFormatter(v, i, days)}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, maxCount + 1]}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-background)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "var(--color-foreground)",
              }}
              labelFormatter={(label: unknown) => formatDate(String(label), days)}
              formatter={(value: unknown) => [`${value}`, "views"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--color-foreground)"
              strokeWidth={1.5}
              fill="url(#viewsGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Conversion funnel + Traffic sources — one box, split by a divider */}
      <div className="bg-background border-border rounded-2xl border overflow-hidden">
        <div className={`grid ${referrers.length > 0 ? "md:grid-cols-2" : ""} divide-y md:divide-y-0 md:divide-x divide-border`}>
          {/* Conversion funnel */}
          <div className="p-6">
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mb-5">
              Conversion funnel
            </p>
            <div className="flex items-center gap-0 mb-5">
              {[
                { label: "Views",     value: total,        sub: null },
                { label: "Inquiries", value: inquiryCount, sub: `${conversionRate}% of views` },
                { label: "Won",       value: wonCount,     sub: `${winRate}% of inquiries` },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center flex-1 min-w-0">
                  {i > 0 && (
                    <svg className="text-border shrink-0" width="14" height="28" viewBox="0 0 14 28" fill="none">
                      <path d="M0 0 L14 14 L0 28" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  )}
                  <div className="flex-1 min-w-0 px-3">
                    <p className="text-foreground text-xl font-semibold tabular-nums">{step.value.toLocaleString()}</p>
                    <p className="text-foreground text-xs font-medium mt-0.5">{step.label}</p>
                    {step.sub && <p className="text-muted-foreground text-[10px] mt-0.5">{step.sub}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[
                { label: "Views",     value: total,        pct: 100 },
                { label: "Inquiries", value: inquiryCount, pct: total > 0 ? (inquiryCount / total) * 100 : 0 },
                { label: "Won",       value: wonCount,     pct: total > 0 ? (wonCount / total) * 100 : 0 },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-muted-foreground text-[10px] w-16 shrink-0">{row.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all duration-700"
                      style={{ width: `${Math.max(row.pct, row.value > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground text-[10px] tabular-nums w-6 text-right">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Traffic sources */}
          {referrers.length > 0 && (
            <div className="p-6">
              <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mb-5">
                Traffic sources
              </p>
              <div className="space-y-3">
                {referrers.map((r) => {
                  const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
                  return (
                    <div key={r.source}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-foreground text-sm font-medium truncate max-w-[70%]">{r.source}</span>
                        <span className="text-muted-foreground text-xs tabular-nums">{r.count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Per-kit breakdown */}
      {byKit.length > 1 && (
        <div className="bg-background border-border rounded-2xl border p-6">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mb-4">
            Views by kit
          </p>
          <div className="space-y-3">
            {byKit.map((kit) => {
              const pct = total > 0 ? Math.round((kit.count / total) * 100) : 0;
              const isActive = activeKitId === kit.id;
              return (
                <button
                  key={kit.id}
                  type="button"
                  onClick={() => setActiveKitId(isActive ? null : kit.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-foreground/80 text-sm font-medium truncate max-w-[70%]">
                      {kit.name}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums shrink-0">
                      {kit.count} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        opacity: isActive ? 1 : 0.5,
                        backgroundColor: "var(--color-foreground)",
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
