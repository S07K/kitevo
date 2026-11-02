"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { CREATOR_NICHES } from "@/lib/niches";
import {
  ADD_ONS,
  CALCULATOR_RATES_KEY,
  PLATFORM_LABEL,
  RATE_BASIS,
  rateEstimate,
  type Platform,
  type SavedCalculatorRates,
} from "@/lib/creator-calculators";
import { NumberField, PlatformPicker, Toggle, parseCount, usd } from "../fields";

const PLATFORMS: Platform[] = ["instagram", "tiktok", "youtube"];
/** The deliverable the big number is for, per platform. */
const HEADLINE: Record<Platform, { id: string; noun: string }> = {
  instagram: { id: "ig-post", noun: "feed post" },
  tiktok: { id: "tt-video", noun: "TikTok video" },
  youtube: { id: "yt-dedicated", noun: "dedicated YouTube video" },
};

/** "What should I charge?" — inputs on the left, live estimate on the right. */
export function RateCalculator() {
  const sp = useSearchParams();
  const initialPlatform = PLATFORMS.includes(sp.get("platform") as Platform) ? (sp.get("platform") as Platform) : "instagram";
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [followers, setFollowers] = useState(sp.get("followers") ?? "");
  const [views, setViews] = useState(sp.get("views") ?? "");
  const [engagement, setEngagement] = useState(sp.get("er") ?? "");
  const [niche, setNiche] = useState("");
  const [usageRights, setUsageRights] = useState(false);
  const [exclusivity, setExclusivity] = useState(false);
  const [saved, setSaved] = useState(false);

  const basis = RATE_BASIS[platform];
  const er = Number(engagement.replace(",", "."));
  const result = useMemo(
    () =>
      rateEstimate({
        platform,
        followers: parseCount(followers),
        views: parseCount(views),
        engagement: Number.isFinite(er) && er > 0 ? er : undefined,
        niche: niche || undefined,
        usageRights,
        exclusivity,
      }),
    [platform, followers, views, er, niche, usageRights, exclusivity],
  );
  const touched = (basis === "views" ? views : followers).trim() !== "";
  const headline = result.ok ? result.lines.find((l) => l.id === HEADLINE[platform].id) ?? result.lines[0] : null;

  /** Hand the mid-points to the kit editor (it offers to import them after sign-up). */
  function saveForKit() {
    if (!result.ok) return;
    const payload: SavedCalculatorRates = {
      savedAt: Date.now(),
      items: result.lines.map((l) => ({ label: l.label, price: l.mid })),
    };
    try {
      localStorage.setItem(CALCULATOR_RATES_KEY, JSON.stringify(payload));
    } catch {
      /* storage blocked: the CTA still takes them to sign up */
    }
    setSaved(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      {/* Inputs */}
      <div className="rounded-[28px] border border-border bg-background p-5 sm:p-7">
        <PlatformPicker
          value={platform}
          onChange={(p) => {
            setPlatform(p);
            setSaved(false);
          }}
        />
        <div className="mt-6 space-y-5">
          {basis === "followers" ? (
            <NumberField label={`${PLATFORM_LABEL[platform]} followers`} value={followers} onChange={setFollowers} placeholder="e.g. 25,000 or 25k" />
          ) : (
            <NumberField
              label="Average views per video"
              hint="Look at your last 10 videos and take a typical number, not your best one. Brands pay for views, not followers."
              value={views}
              onChange={setViews}
              placeholder="e.g. 18,000 or 18k"
            />
          )}
          <NumberField
            label="Engagement rate"
            optional
            suffix="%"
            value={engagement}
            onChange={setEngagement}
            placeholder="e.g. 3.2"
            hint={
              <>
                Don&apos;t know it? <Link href="/tools/engagement-rate-calculator" className="font-medium text-foreground underline underline-offset-2">Work it out in 10 seconds</Link>.
              </>
            }
          />
          <div>
            <label htmlFor="rate-niche" className="text-sm font-medium text-foreground">Your niche</label>
            <select
              id="rate-niche"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choose one (optional)</option>
              {CREATOR_NICHES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <fieldset className="space-y-3 border-t border-border pt-5">
            <legend className="sr-only">What the brand is asking for</legend>
            <p className="text-sm font-medium text-foreground">Is the brand also asking for…</p>
            <Toggle checked={usageRights} onChange={setUsageRights} label={ADD_ONS.usageRights.label} />
            <Toggle checked={exclusivity} onChange={setExclusivity} label={ADD_ONS.exclusivity.label} />
          </fieldset>
        </div>
      </div>

      {/* Result */}
      <div className="rounded-[28px] bg-primary p-5 text-primary-foreground sm:p-7 lg:sticky lg:top-6" aria-live="polite">
        {result.ok && headline ? (
          <>
            <p className="text-sm text-primary-foreground/75">Suggested rate for one {HEADLINE[platform].noun}</p>
            <p className="mt-2 font-display text-[clamp(36px,6vw,56px)] font-semibold leading-none tabular-nums">
              {usd(headline.low)}–{usd(headline.high)}
            </p>
            <p className="mt-2 text-sm text-primary-foreground/75">Quote around {usd(headline.mid)} and negotiate from there.</p>

            <div className="mt-6 overflow-hidden rounded-2xl bg-background text-foreground">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border px-4 py-2.5 text-xs font-medium text-muted-foreground">
                <span>Deliverable</span>
                <span>Range</span>
              </div>
              {result.lines.map((l) => (
                <div key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-b border-border px-4 py-3 last:border-0">
                  <span className="min-w-0 text-sm">{l.label}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {usd(l.low)}–{usd(l.high)}
                  </span>
                </div>
              ))}
            </div>

            <ul className="mt-5 space-y-1.5 text-xs leading-relaxed text-primary-foreground/80">
              <li>
                Engagement:{" "}
                {result.benchmark === null
                  ? "not entered, so treated as typical."
                  : `${er}% vs a typical ${result.benchmark}% for your size → ×${result.factors.engagement.toFixed(2)}.`}
              </li>
              <li>Niche: {niche ? `${niche} → ×${result.factors.niche.toFixed(2)}.` : "not chosen, so no adjustment."}</li>
              {result.factors.addOns > 1 && <li>Usage rights / exclusivity → ×{result.factors.addOns.toFixed(2)}.</li>}
            </ul>

            <div className="mt-6 rounded-2xl bg-primary-foreground/10 p-4">
              <p className="text-sm font-medium">Put these rates on a live media kit</p>
              <p className="mt-1 text-xs leading-relaxed text-primary-foreground/80">
                Brands see your rate card next to your real, synced stats. Free to start; your numbers carry over when you sign up.
              </p>
              <Link
                href="/signup?from=rate-calculator"
                onClick={saveForKit}
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-background px-5 text-sm font-medium text-foreground transition-opacity hover:opacity-85"
              >
                {saved ? <Check size={16} aria-hidden /> : null}
                Create my kit with these rates <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
          </>
        ) : (
          <div className="flex min-h-[260px] flex-col justify-center">
            <p className="font-display text-2xl font-semibold leading-tight">What should you charge?</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-primary-foreground/80">
              {touched && !result.ok ? result.error : `Enter your ${basis === "views" ? "average views" : "follower count"} and you'll get a price range for every common deliverable.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
