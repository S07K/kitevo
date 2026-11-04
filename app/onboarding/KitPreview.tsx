"use client";

import { BrandIcon } from "@/app/components/BrandIcon";
import { LogoMark } from "@/app/components/Logo";

/**
 * Live phone-frame preview of the creator's kit during onboarding. It only ever shows
 * what the creator has entered or connected — never sample numbers (kit honesty rules):
 * unconnected platforms render as an empty "connect to show" tile.
 */
export function KitPreview({
  name,
  username,
  niches,
  avatarUrl,
  instagramConnected,
  youtubeConnected,
  host = "getkitevo.com",
}: {
  name: string;
  username: string;
  niches: string[];
  avatarUrl?: string | null;
  instagramConnected: boolean;
  youtubeConnected: boolean;
  /** Host shown in the fake URL bar (the real one, so it matches the form). */
  host?: string;
}) {
  const display = name.trim() || "Your name";
  const initials = display
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const platforms = [
    { id: "ig", label: "Instagram", connected: instagramConnected, brand: "instagram" as const },
    { id: "yt", label: "YouTube", connected: youtubeConnected, brand: "youtube" as const },
  ];

  return (
    <div className="relative mx-auto w-[300px]" aria-label="Preview of your media kit">
      {/* Phone frame */}
      <div className="rounded-[44px] border border-border bg-foreground/90 p-2.5 shadow-2xl">
        <div className="relative overflow-hidden rounded-[36px] bg-background">
          {/* Notch */}
          <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-foreground/90" aria-hidden />

          {/* URL bar */}
          <div className="px-5 pb-2 pt-10">
            <div className="truncate rounded-full bg-muted px-3 py-1.5 text-center font-mono text-[10px] text-muted-foreground">
              {host}/kit/{username || "yourname"}
            </div>
          </div>

          <div className="min-h-[470px] px-5 pb-6">
            {/* Hero */}
            <div className="flex flex-col items-center pt-4 text-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover ring-4 ring-muted" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted font-display text-2xl text-muted-foreground ring-4 ring-muted/50">
                  {initials || "·"}
                </div>
              )}
              <p className={`mt-4 font-display text-xl font-semibold tracking-tight ${name.trim() ? "text-foreground" : "text-muted-foreground/60"}`}>
                {display}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">@{username || "yourname"}</p>
              <div className="mt-3 flex min-h-[22px] flex-wrap justify-center gap-1.5">
                {niches.length > 0 ? (
                  niches.map((n) => (
                    <span key={n} className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-400">
                      {n}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-[10px] text-muted-foreground/70">
                    Your niches
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 grid grid-cols-2 gap-2">
              {platforms.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-2xl p-3 transition-colors ${p.connected ? "bg-muted/60" : "border border-dashed border-border"}`}
                >
                  <div className="flex items-center gap-1.5">
                    <BrandIcon brand={p.brand} size={12} mono={!p.connected} className={p.connected ? "" : "text-muted-foreground/60"} />
                    <span className="text-[10px] font-medium text-muted-foreground">{p.label}</span>
                  </div>
                  {p.connected ? (
                    <>
                      <p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
                        Connected
                      </p>
                      <p className="mt-0.5 text-[9px] text-muted-foreground">Live stats on your kit</p>
                    </>
                  ) : (
                    <>
                      <div className="mt-2 h-2 w-12 rounded-full bg-muted" />
                      <p className="mt-1.5 text-[9px] text-muted-foreground/70">Connect to show stats</p>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Section skeletons */}
            <div className="mt-5 space-y-2" aria-hidden>
              <div className="h-2 w-16 rounded-full bg-muted" />
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="aspect-[9/14] rounded-lg bg-muted/70" />
                ))}
              </div>
            </div>
            <div className="mt-5 rounded-full bg-foreground py-2.5 text-center text-[11px] font-medium text-background">Work with me</div>

            <p className="mt-5 flex items-center justify-center gap-1 text-[9px] text-muted-foreground/70">
              <LogoMark size={9} mono on="auto" /> Made with Kitevo
            </p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Live preview · updates as you type</p>
    </div>
  );
}
