"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DailyPoint {
  date: string;
  count: number;
}

interface ReferrerEntry {
  source: string;
  count: number;
}

interface Props {
  daily: DailyPoint[];
  referrers: ReferrerEntry[];
  total: number;
}

function formatDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Show every ~5th label to avoid crowding
function tickFormatter(value: string, index: number) {
  return index % 5 === 0 ? formatDate(value) : "";
}

export function AnalyticsChart({ daily, referrers, total }: Props) {
  const maxCount = Math.max(...daily.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Views chart */}
      <div className="bg-background border-border rounded-2xl border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mb-1">
              Views — last 30 days
            </p>
            <p className="font-display text-foreground text-2xl font-semibold tabular-nums">
              {total.toLocaleString()}
            </p>
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
              tickFormatter={tickFormatter}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, maxCount + 1]}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                fontSize: "12px",
                color: "var(--foreground)",
              }}
              labelFormatter={(label: unknown) => formatDate(String(label))}
              formatter={(value: unknown) => [`${value}`, "views"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--foreground)"
              strokeWidth={1.5}
              fill="url(#viewsGrad)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Referrer breakdown */}
      {referrers.length > 0 && (
        <div className="bg-background border-border rounded-2xl border p-6">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground mb-4">
            Traffic sources
          </p>
          <div className="space-y-3">
            {referrers.map((r) => {
              const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
              return (
                <div key={r.source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-foreground text-sm font-medium truncate max-w-[70%]">
                      {r.source}
                    </span>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {r.count} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground/60 transition-all duration-500"
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
  );
}
