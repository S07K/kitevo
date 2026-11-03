import { SiLinktree } from "@icons-pack/react-simple-icons";
import { FileText, Link2, ShoppingBag } from "lucide-react";
import { LogoMark } from "@/app/components/Logo";
import { Cutout, KitCard, unsplashPortrait, type KitLook } from "@/app/components/landing/cutouts";
import type { Comparison } from "@/lib/comparisons";
import { ScaleToFit } from "@/app/components/ScaleToFit";

/** The landing page's example kit (disclosed there as an example), reused for the Kitevo side. */
const EXAMPLE_KIT: KitLook = {
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

/** A brand's mark at a given size. Simple Icons where available, else a neutral lettermark. */
export function BrandMark({ who, size = 28 }: { who: "kitevo" | Comparison["mark"]; size?: number }) {
  const box = { width: size, height: size };
  if (who === "kitevo") {
    return (
      <span className="inline-flex shrink-0 items-center justify-center rounded-[28%] bg-[#1b365d] dark:bg-white" style={box}>
        <span className="dark:hidden"><LogoMark size={Math.round(size * 0.62)} on="ink" /></span>
        <span className="hidden dark:inline"><LogoMark size={Math.round(size * 0.62)} on="cream" /></span>
      </span>
    );
  }
  if (who.kind === "linktree") {
    return (
      <span className="inline-flex shrink-0 items-center justify-center rounded-[28%] bg-[#43E55E] text-black" style={box}>
        <SiLinktree size={Math.round(size * 0.56)} aria-hidden />
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[28%] border border-border bg-background font-display font-semibold text-foreground"
      style={{ ...box, fontSize: size * 0.5 }}
      aria-hidden
    >
      {who.letter}
    </span>
  );
}

/** "[K] Kitevo  vs  [S] Stan Store" */
export function VsLockup({ c, size = 36 }: { c: Comparison; size?: number }) {
  const short = c.name.replace(/^a /, "");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <BrandMark who="kitevo" size={size} /> Kitevo
      </span>
      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">vs</span>
      <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <BrandMark who={c.mark} size={size} /> {short}
      </span>
    </div>
  );
}

/** Generic sketch of the other product type. Deliberately not a recreation of their UI. */
function OtherSketch({ art }: { art: Comparison["art"] }) {
  const line = (w: string, o = "0.12") => <span className="block h-2 rounded-full" style={{ width: w, backgroundColor: `rgba(27,54,93,${o})` }} />;
  if (art === "storefront") {
    return (
      <Cutout className="w-full p-4">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold opacity-60"><ShoppingBag size={12} aria-hidden /> Storefront</p>
        <div className="grid grid-cols-2 gap-2.5">
          {["$19", "$49", "$9", "$99"].map((price, i) => (
            <div key={i} className="rounded-xl bg-[#1b365d]/[0.05] p-2.5">
              <span className="block aspect-[4/3] rounded-lg bg-[#1b365d]/10" />
              <span className="mt-2 block">{line("80%")}</span>
              <span className="mt-2 flex items-center justify-between text-[11px] font-semibold">
                {price}
                <span className="rounded-full bg-[#1b365d] px-2 py-0.5 text-[10px] text-white">Buy</span>
              </span>
            </div>
          ))}
        </div>
      </Cutout>
    );
  }
  if (art === "links") {
    return (
      <Cutout className="w-full p-5">
        <span className="mx-auto block h-12 w-12 rounded-full bg-[#1b365d]/10" />
        <span className="mx-auto mt-2 block w-24">{line("100%", "0.18")}</span>
        <div className="mt-4 space-y-2">
          {["86%", "70%", "78%", "62%"].map((w, i) => (
            <span key={i} className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#1b365d]/15">
              <Link2 size={11} className="opacity-40" aria-hidden />
              <span className="block h-2 rounded-full bg-[#1b365d]/15" style={{ width: `calc(${w} - 40px)` }} />
            </span>
          ))}
        </div>
      </Cutout>
    );
  }
  if (art === "allinone") {
    return (
      <Cutout className="w-full p-4">
        <div className="space-y-2">
          {["80%", "65%"].map((w, i) => (
            <span key={i} className="flex h-8 items-center justify-center rounded-full border border-[#1b365d]/15">
              <span className="block h-2 rounded-full bg-[#1b365d]/15" style={{ width: `calc(${w} - 40px)` }} />
            </span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span className="rounded-xl bg-[#1b365d]/[0.05] p-2.5">
            <span className="block aspect-square rounded-lg bg-[#1b365d]/10" />
            <span className="mt-2 block">{line("70%")}</span>
          </span>
          <span className="flex flex-col justify-between rounded-xl bg-[#1b365d]/[0.05] p-2.5 text-[#1b365d]">
            <span className="text-[10px] font-semibold opacity-60">Media kit</span>
            <span className="font-display text-xl font-semibold">24K</span>
            {line("60%")}
          </span>
        </div>
        <span className="mt-3 flex h-8 items-center justify-center rounded-full bg-[#1b365d] text-[11px] font-semibold text-white">Subscribe</span>
      </Cutout>
    );
  }
  // static: a document page with numbers typed in
  return (
    <Cutout className="w-full p-5">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold opacity-60"><FileText size={12} aria-hidden /> media-kit.pdf</p>
      <span className="mt-3 block aspect-[4/3] rounded-lg bg-[#1b365d]/10" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {["Followers", "Engagement"].map((l) => (
          <span key={l} className="rounded-lg border border-dashed border-[#1b365d]/20 p-2 text-[#1b365d]">
            <span className="block text-[10px] opacity-60">{l}</span>
            <span className="font-display text-base font-semibold opacity-70">typed in</span>
          </span>
        ))}
      </div>
      <span className="mt-3 block space-y-1.5">{line("90%")}{line("70%")}</span>
    </Cutout>
  );
}

/** Hero illustration: the Kitevo kit vs a sketch of the other product type. */
export function CompareHeroArt({ c }: { c: Comparison }) {
  const short = c.name.replace(/^a /, "");
  return (
    <figure aria-label={`Illustration: a Kitevo media kit next to a sketch of ${short}`}>
      {/* Designed at 560px and scaled down on phones so the kit card never squashes. */}
      <ScaleToFit width={560}>
        <div className="relative">
          <div className="grid grid-cols-2 items-center gap-6">
            <div className="min-w-0">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><BrandMark who="kitevo" size={18} /> Kitevo</p>
              <KitCard look={EXAMPLE_KIT} showNiche={false} />
            </div>
            <div className="min-w-0">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><BrandMark who={c.mark} size={18} /> {short}</p>
              <OtherSketch art={c.art} />
            </div>
          </div>
          <span
            className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground shadow-lg ring-4 ring-canvas"
            aria-hidden
          >
            vs
          </span>
        </div>
      </ScaleToFit>
      <figcaption className="mt-3 text-[11px] text-muted-foreground">Illustration of what each is built around, not a screenshot. Example kit.</figcaption>
    </figure>
  );
}
