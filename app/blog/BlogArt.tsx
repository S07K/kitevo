import { Mail, Paperclip } from "lucide-react";
import { ScaleToFit } from "@/app/components/ScaleToFit";
import { Cutout, KitCard, unsplashPortrait, type KitLook } from "@/app/components/landing/cutouts";
import { EXAMPLES } from "@/app/components/landing/EarnSections";

/**
 * Blog cover illustrations, built from the landing page's kit cutouts (example creators,
 * disclosed as examples on the landing page). Chosen per post with `cover:` in frontmatter.
 */
export type BlogCoverKind = "kit" | "pitch" | "examples";

const MAYA: KitLook = {
  name: "Maya Okafor",
  handle: "maya.makes",
  niche: "Beauty",
  initials: "MO",
  photo: unsplashPortrait("photo-1531123897727-8f129e1688ce"),
  bg: "#ffffff",
  fg: "#1b365d",
  accent: "#005a9c",
  accentFg: "#ffffff",
  followers: "48.2K",
  second: "5.8%",
  platform: "instagram",
  rates: [
    { label: "Instagram Reel", price: "$450" },
    { label: "Story set (3)", price: "$220" },
  ],
};

function Pill({ children }: { children: string }) {
  return <span className="rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-[#1b365d] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.45)]">{children}</span>;
}

function KitCover() {
  return (
    <div className="flex h-full items-center justify-center gap-10">
      <KitCard look={MAYA} showNiche={false} className="w-[300px]" />
      <div className="flex flex-col items-start gap-5">
        {["Live stats, synced", "Your audience, at a glance", "Clear rates", "One button to reach you"].map((t, i) => (
          <span key={t} className="flex items-center gap-3">
            <span className="h-px w-10 bg-white/60" aria-hidden />
            <span className={i % 2 ? "translate-x-3" : ""}><Pill>{t}</Pill></span>
          </span>
        ))}
      </div>
    </div>
  );
}

function PitchCover() {
  return (
    <div className="relative h-full">
      {/* Side by side, slightly overlapping at the edge: both fully readable. */}
      <KitCard look={MAYA} showNiche={false} className="absolute right-10 top-1/2 w-[260px] -translate-y-1/2 rotate-[5deg]" />
      <Cutout className="absolute left-12 top-1/2 z-10 w-[360px] -translate-y-1/2 p-5">
        <p className="flex items-center gap-2 text-[12px] font-semibold opacity-60"><Mail size={13} aria-hidden /> New message</p>
        <div className="mt-3 space-y-1.5 border-b border-[#1b365d]/10 pb-3 text-[13px]">
          <p><span className="opacity-50">To </span>partnerships@brand.com</p>
          <p><span className="opacity-50">Subject </span><span className="font-semibold">Spring launch × @maya.makes</span></p>
        </div>
        <div className="mt-3 space-y-2">
          {["92%", "84%", "60%"].map((w) => <span key={w} className="block h-2 rounded-full bg-[#1b365d]/12" style={{ width: w }} />)}
        </div>
        <span className="mt-4 flex items-center gap-2 rounded-xl bg-[#1b365d]/[0.06] px-3 py-2.5 text-[12px] font-semibold">
          <Paperclip size={13} aria-hidden /> getkitevo.com/kit/maya.makes
        </span>
        <span className="mt-4 inline-flex rounded-full bg-[#005a9c] px-4 py-2 text-[12px] font-semibold text-white">Send</span>
      </Cutout>
    </div>
  );
}

function ExamplesCover() {
  const tilt = ["-rotate-[7deg] translate-y-4", "z-10 -translate-y-2", "rotate-[7deg] translate-y-4"];
  return (
    <div className="flex h-full items-center justify-center">
      {EXAMPLES.slice(0, 3).map(({ look }, i) => (
        <div key={look.handle} className={`-mx-6 w-[250px] ${tilt[i]}`}>
          <KitCard look={look} showNiche className="w-[250px]" />
        </div>
      ))}
    </div>
  );
}

/** A post's cover: designed at 720×405 on a brand panel, scaled to fit. */
export function BlogCover({ kind, className = "" }: { kind: BlogCoverKind; className?: string }) {
  return (
    <div className={`overflow-hidden rounded-[24px] ${className}`} aria-hidden>
      <ScaleToFit width={720}>
        <div
          className="relative h-[405px] w-[720px] overflow-hidden"
          style={{ backgroundImage: "radial-gradient(circle at 20% 15%, #60c1e5 0%, transparent 45%), linear-gradient(150deg, #005a9c 0%, #1b365d 70%)" }}
        >
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
          <div className="relative h-full">{kind === "pitch" ? <PitchCover /> : kind === "examples" ? <ExamplesCover /> : <KitCover />}</div>
        </div>
      </ScaleToFit>
    </div>
  );
}

export function coverKind(raw: string | undefined): BlogCoverKind {
  return raw === "pitch" || raw === "examples" ? raw : "kit";
}
