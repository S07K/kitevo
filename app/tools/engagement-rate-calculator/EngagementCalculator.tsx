"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { engagementRate, PLATFORM_LABEL, type Platform, type Verdict } from "@/lib/creator-calculators";
import { NumberField, PlatformPicker, parseCount } from "../fields";

const VERDICT: Record<Verdict, { label: string; body: string }> = {
  low: { label: "Low", body: "Well under what's typical for your size. Fewer, better posts and replying to comments usually lift it fastest." },
  below: { label: "A little below typical", body: "Close to normal. Hooks in the first second and a clear question in the caption tend to help." },
  healthy: { label: "Healthy", body: "Right where brands expect for an account your size. Worth showing on your media kit." },
  strong: { label: "Strong", body: "Well above typical for your size. Lead with this when you pitch brands." },
};

/** Where the result sits on a 0 → 2× benchmark track, as a percentage of the track. */
function trackPosition(rate: number, benchmark: number) {
  return Math.min(100, Math.max(0, (rate / (benchmark * 2)) * 100));
}

export function EngagementCalculator() {
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [followers, setFollowers] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [shares, setShares] = useState("");
  const [views, setViews] = useState("");

  const result = useMemo(
    () =>
      engagementRate({
        platform,
        followers: parseCount(followers),
        likes: parseCount(likes) ?? 0,
        comments: parseCount(comments) ?? 0,
        shares: parseCount(shares),
        views: parseCount(views),
      }),
    [platform, followers, likes, comments, shares, views],
  );
  const touched = [followers, likes, comments, views].some((v) => v.trim() !== "");
  const rateText = result.ok ? `${result.rate < 10 ? result.rate.toFixed(2) : result.rate.toFixed(1)}%` : "";
  const rateParam = result.ok ? (Math.round(result.rate * 100) / 100).toString() : "";

  const nextRateHref = result.ok
    ? `/tools/rate-calculator?${new URLSearchParams({
        platform,
        er: rateParam,
        ...(parseCount(followers) ? { followers: String(parseCount(followers)) } : {}),
        ...(parseCount(views) ? { views: String(parseCount(views)) } : {}),
      })}`
    : "/tools/rate-calculator";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="rounded-[28px] border border-border bg-background p-5 sm:p-7">
        <PlatformPicker value={platform} onChange={setPlatform} />
        <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
          Use averages from your last 10 {platform === "instagram" ? "posts" : "videos"}: add up each number and divide by 10.
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          {platform !== "youtube" && (
            <div className="sm:col-span-2">
              <NumberField label={platform === "tiktok" ? "Followers" : "Instagram followers"} value={followers} onChange={setFollowers} placeholder="e.g. 25k" />
            </div>
          )}
          {platform !== "instagram" && (
            <div className="sm:col-span-2">
              <NumberField
                label="Average views per video"
                optional={platform === "tiktok"}
                hint={platform === "tiktok" ? "With views, we measure engagement per view, which is how TikTok itself ranks videos." : undefined}
                value={views}
                onChange={setViews}
                placeholder="e.g. 40k"
              />
            </div>
          )}
          <NumberField label="Average likes" value={likes} onChange={setLikes} placeholder="e.g. 850" />
          <NumberField label="Average comments" value={comments} onChange={setComments} placeholder="e.g. 40" />
          {platform !== "youtube" && (
            <div className="sm:col-span-2">
              <NumberField
                label={platform === "tiktok" ? "Average shares" : "Average saves + shares"}
                optional
                hint={platform === "instagram" ? "Shown in each post's insights. Leave blank if you don't have them." : undefined}
                value={shares}
                onChange={setShares}
                placeholder="e.g. 60"
              />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[28px] bg-primary p-5 text-primary-foreground sm:p-7 lg:sticky lg:top-6" aria-live="polite">
        {result.ok ? (
          <>
            <p className="text-sm text-primary-foreground/75">Your {PLATFORM_LABEL[platform]} engagement rate</p>
            <p className="mt-2 font-display text-[clamp(44px,8vw,72px)] font-semibold leading-none tabular-nums">{rateText}</p>
            <p className="mt-3 inline-flex rounded-full bg-primary-foreground/15 px-3 py-1 text-sm font-medium">{VERDICT[result.verdict].label}</p>

            <div className="mt-6">
              <div className="relative h-2 rounded-full bg-primary-foreground/20">
                <div className="absolute inset-y-0 left-1/2 w-px bg-primary-foreground/60" aria-hidden />
                <div
                  className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-primary-foreground shadow"
                  style={{ left: `${trackPosition(result.rate, result.benchmark)}%` }}
                  aria-hidden
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-primary-foreground/70">
                <span>0%</span>
                <span>Typical for your size: {result.benchmark}%</span>
                <span>{result.benchmark * 2}%+</span>
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-primary-foreground/85">{VERDICT[result.verdict].body}</p>
            {result.suspicious && (
              <p className="mt-3 text-xs leading-relaxed text-primary-foreground/80">
                Over 30% is unusual. Double-check you used averages per post and your full follower count.
              </p>
            )}
            <p className="mt-3 text-xs text-primary-foreground/70">
              Measured per {result.basis === "views" ? "view" : "follower"}: likes + comments{platform !== "youtube" ? " + shares" : ""}, divided by{" "}
              {result.basis === "views" ? "views" : "followers"}, times 100.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link
                href={nextRateHref}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-background px-5 text-sm font-medium text-foreground transition-opacity hover:opacity-85"
              >
                What should I charge? <ArrowRight size={16} aria-hidden />
              </Link>
              <Link
                href="/signup?from=engagement-calculator"
                className="inline-flex h-11 items-center justify-center rounded-full border border-primary-foreground/40 px-5 text-sm font-medium transition-colors hover:bg-primary-foreground/10"
              >
                Show it on a live kit
              </Link>
            </div>
          </>
        ) : (
          <div className="flex min-h-[260px] flex-col justify-center">
            <p className="font-display text-2xl font-semibold leading-tight">How engaged is your audience?</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-primary-foreground/80">
              {touched ? result.error : "Fill in your averages and you'll see your engagement rate and how it compares with accounts your size."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
