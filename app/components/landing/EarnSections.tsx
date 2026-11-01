import Link from "next/link";
import type { ReactNode } from "react";
import { SiInstagram, SiYoutube } from "@icons-pack/react-simple-icons";
import { BadgeCheck, CalendarClock, Check, ChevronsRight, Eye, FileText, Link2, MessageCircle, Sheet, Sparkles, Tag, TrendingUp } from "lucide-react";
import { getPublicTiers } from "@/config/subscriptions";
import { exampleEarnings } from "@/lib/referral-terms";
import { Cutout, ExampleTag, KitMock, PhoneFrame, Scribble, type KitLook } from "./cutouts";

/* Shared pieces ─────────────────────────────────────────────────────────── */

const shell = "mx-auto max-w-[1200px] px-6 sm:px-10";

function Heading({ title, children, center = false }: { title: string; children?: ReactNode; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <h2 className="text-[clamp(30px,4.2vw,52px)] font-medium leading-[1.05] tracking-[-0.025em] text-foreground text-balance">{title}</h2>
      {children && <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{children}</p>}
    </div>
  );
}

function StartFree({ label = "Start free" }: { label?: string }) {
  return (
    <Link
      href="/signup"
      className="focus-ring mt-8 inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
    >
      {label}
    </Link>
  );
}

/* 0% ──────────────────────────────────────────────────────────────────────── */

/** Kitevo never touches deal money: brands pay creators directly. */
export function NoCut(): ReactNode {
  const paid = getPublicTiers().filter((t) => t.priceMonthly > 0);
  const from = Math.min(...paid.map((t) => t.priceMonthly));
  return (
    <section className={`${shell} py-24 sm:py-32`}>
      <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-center sm:gap-10 sm:text-left">
        <div className="relative grid h-[150px] w-[200px] shrink-0 place-items-center sm:h-[190px] sm:w-[250px]">
          <Scribble className="absolute inset-0 h-full w-full" />
          <span className="text-[84px] font-semibold leading-none tracking-[-0.05em] text-foreground sm:text-[108px]">0%</span>
        </div>
        <div className="max-w-md">
          <p className="text-[clamp(26px,3.4vw,42px)] font-medium leading-[1.1] tracking-[-0.02em] text-foreground">
            of your brand deals goes to Kitevo.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Brands pay you directly. You pay a flat plan price: free to start, paid plans from ${from}/mo.
          </p>
        </div>
      </div>
    </section>
  );
}

/* Ways to earn ───────────────────────────────────────────────────────────── */

/** Tinted half-band that the cutouts sit on, bleeding to the page edge on one side. */
function Band({ side, children }: { side: "left" | "right"; children: ReactNode }) {
  return (
    <div className="relative py-10 sm:py-14">
      <div
        className={`absolute inset-y-0 bg-primary-soft ${
          side === "left" ? "-left-[50vw] right-10 rounded-r-[40px]" : "-right-[50vw] left-10 rounded-l-[40px]"
        }`}
        aria-hidden
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function CampaignVisual() {
  return (
    <div className="relative mx-auto h-[330px] max-w-[440px]" aria-hidden>
      <Cutout className="absolute left-10 top-0 w-[300px] p-4 opacity-60" style={{ transform: "rotate(4deg)" }}>
        <p className="text-sm font-semibold">Trail week: hiking gear haul</p>
        <p className="text-[11px] text-[#556b84]">Northwind Outdoors</p>
      </Cutout>
      <Cutout className="absolute left-0 top-10 w-[320px] p-5" style={{ transform: "rotate(-2deg)" }}>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e3f4fa] text-sm font-bold text-[#005a9c]">G</span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[11px] text-[#556b84]">
              Glowfield Skincare <BadgeCheck size={12} className="text-[#7c3aed]" />
            </p>
            <p className="text-base font-semibold leading-snug">Summer glow launch</p>
          </div>
          <ExampleTag />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#556b84]">
          Looking for beauty creators to show a 3-step morning routine with our new SPF serum.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Beauty", "$500–$2k", "9 days left"].map((c) => (
            <span key={c} className="rounded-full bg-[#f3f7fa] px-2.5 py-1 text-[11px] font-medium">
              {c}
            </span>
          ))}
        </div>
        <span className="mt-4 block rounded-full bg-[#005a9c] py-2.5 text-center text-xs font-semibold text-white">Apply with my kit</span>
      </Cutout>
      <Cutout className="absolute bottom-0 right-0 hidden w-[210px] p-4 sm:block" style={{ transform: "rotate(3deg)" }}>
        <p className="text-[11px] font-semibold">Your application</p>
        {[
          { t: "Applied", on: true },
          { t: "Under review", on: true },
          { t: "Brand reached out", on: false },
        ].map((s) => (
          <p key={s.t} className="mt-2 flex items-center gap-2 text-[11px]">
            <span className={`h-2.5 w-2.5 rounded-full ${s.on ? "bg-[#005a9c]" : "bg-[#dce6ef]"}`} />
            <span className={s.on ? "" : "text-[#556b84]"}>{s.t}</span>
          </p>
        ))}
      </Cutout>
    </div>
  );
}

function PipelineVisual() {
  const col = (label: string, dot: string, cards: Array<{ who: string; what: string; amount?: string; won?: boolean }>) => (
    <div className="min-w-0 flex-1">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} /> {label}
      </p>
      <div className="space-y-1.5 rounded-xl bg-[#f3f7fa] p-1.5">
        {cards.map((c) => (
          <div key={c.who} className={`rounded-lg border bg-white p-2 ${c.won ? "border-[#22c55e]/50" : "border-[#dce6ef]"}`}>
            <p className="truncate text-[11px] font-semibold">{c.who}</p>
            <p className="truncate text-[10px] text-[#556b84]">{c.what}</p>
            {c.amount && <p className={`mt-1 text-[11px] font-semibold tabular-nums ${c.won ? "text-[#15803d]" : ""}`}>{c.amount}</p>}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    // Form (top-left) → arrow → pipeline (bottom-right). The pipeline sits lower and to the
    // right so all three columns stay visible; the form only overlaps its empty corner.
    <div className="relative mx-auto max-w-[500px] pb-2" aria-hidden>
      <Cutout className="relative z-10 w-[220px] p-4" style={{ transform: "rotate(-3deg)" }}>
        <p className="text-xs font-semibold">Work with Maya</p>
        <p className="text-[10px] text-[#556b84]">Contact form on her kit</p>
        {[
          ["Name", "Priya, Northwind Outdoors"],
          ["Budget", "$800 for 2 Reels"],
        ].map(([l, v]) => (
          <div key={l} className="mt-2">
            <p className="text-[9px] text-[#556b84]">{l}</p>
            <p className="rounded-md border border-[#dce6ef] px-2 py-1 text-[11px]">{v}</p>
          </div>
        ))}
        <span className="mt-3 block rounded-full bg-[#005a9c] py-2 text-center text-[11px] font-semibold text-white">Send inquiry</span>
      </Cutout>
      <ChevronsRight className="absolute left-[228px] top-[150px] z-10 hidden rotate-[20deg] text-[#60c1e5] sm:block" size={34} strokeWidth={2.5} />
      <Cutout className="relative -mt-6 ml-auto w-[min(100%,340px)] p-3 sm:-mt-20" style={{ transform: "rotate(2deg)" }}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold">Pipeline</p>
          <ExampleTag />
        </div>
        <div className="flex gap-1.5">
          {col("New", "bg-[#005a9c]", [{ who: "Northwind", what: "2 Reels", amount: "$800" }])}
          {col("Negotiating", "bg-violet-500", [{ who: "Brewbox Coffee", what: "Story set" }])}
          {col("Won", "bg-[#22c55e]", [{ who: "Glowfield", what: "1 Reel + 3 Stories", amount: "$1,200", won: true }])}
        </div>
      </Cutout>
    </div>
  );
}

function ProofVisual() {
  return (
    <div className="relative mx-auto h-[340px] max-w-[440px]" aria-hidden>
      <Cutout className="absolute left-0 top-0 w-[270px] p-4" style={{ transform: "rotate(-2deg)" }}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[11px] text-[#556b84]">
            <SiInstagram size={11} color="#E4405F" /> Followers, last 30 days
          </p>
          <ExampleTag />
        </div>
        <p className="mt-1 text-2xl font-semibold tabular-nums">
          48.2K <span className="text-xs font-medium text-[#15803d]">+1,204</span>
        </p>
        <svg viewBox="0 0 240 70" className="mt-2 h-16 w-full" fill="none">
          <path d="M0 60 C30 56 50 52 75 48 S120 40 145 33 S195 20 240 8" stroke="#005A9C" strokeWidth="3" strokeLinecap="round" />
          <path d="M0 60 C30 56 50 52 75 48 S120 40 145 33 S195 20 240 8 V70 H0Z" fill="#60C1E5" opacity="0.18" />
        </svg>
      </Cutout>
      <Cutout className="absolute right-0 top-16 w-[190px] p-4" style={{ transform: "rotate(3deg)" }}>
        <p className="text-[11px] text-[#556b84]">Audience age</p>
        {[
          ["18–24", 34],
          ["25–34", 46],
          ["35–44", 14],
        ].map(([a, v]) => (
          <div key={a} className="mt-2">
            <p className="flex justify-between text-[10px]">
              <span>{a}</span>
              <span className="tabular-nums">{v}%</span>
            </p>
            <div className="mt-0.5 h-1.5 rounded-full bg-[#edf3f8]">
              <div className="h-full rounded-full bg-[#60c1e5]" style={{ width: `${v}%` }} />
            </div>
          </div>
        ))}
      </Cutout>
      <Cutout className="absolute bottom-0 left-12 w-[260px] p-4" style={{ transform: "rotate(-1deg)" }}>
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <Tag size={13} className="text-[#005a9c]" /> Rates
        </p>
        {[
          ["Instagram Reel", "$450"],
          ["Story set (3)", "$220"],
          ["YouTube integration", "$900"],
        ].map(([l, p]) => (
          <p key={l} className="mt-2 flex justify-between border-b border-[#edf3f8] pb-1.5 text-xs last:border-0">
            <span className="text-[#556b84]">{l}</span>
            <span className="font-semibold tabular-nums">{p}</span>
          </p>
        ))}
      </Cutout>
    </div>
  );
}

/** Three concrete ways Kitevo leads to paid work, each beside a cutout of the real surface. */
export function WaysToEarn(): ReactNode {
  const rows = [
    {
      title: "Brands post campaigns. You apply with your kit.",
      body: "Open briefs from brands, matched to your niches. Apply with a short pitch and the brand sees your live kit right next to it, then reaches out in Messages.",
      visual: <CampaignVisual />,
      side: "left" as const,
    },
    {
      title: "Brands reach out from your kit. Every deal lands in one pipeline.",
      body: "Pro kits carry a contact form. Each inquiry arrives in your Pipeline, where you move it from first message to won. No DMs to dig through, no spreadsheet.",
      visual: <PipelineVisual />,
      side: "right" as const,
      pro: true,
    },
    {
      title: "Your rates, backed by numbers brands can check.",
      body: "Followers, engagement, audience and growth sync from Instagram and YouTube. Put your rates beside them, so a brand can say yes without asking for screenshots.",
      visual: <ProofVisual />,
      side: "left" as const,
    },
  ];

  return (
    <section id="ways-to-earn" className="scroll-mt-24 overflow-x-clip py-8 sm:py-12">
      <div className={shell}>
        <Heading title="Three ways Kitevo gets you paid">
          Every part of Kitevo points at one thing: more brand deals at better rates, with less chasing.
        </Heading>
      </div>
      <div className={`${shell} mt-14 space-y-20 sm:space-y-28`}>
        {rows.map((r) => (
          <div key={r.title} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className={r.side === "right" ? "lg:order-2" : ""}>
              <Band side={r.side}>{r.visual}</Band>
            </div>
            <div className={r.side === "right" ? "lg:order-1" : ""}>
              {r.pro && <span className="mb-4 inline-flex rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary-soft-foreground">Pro</span>}
              <h3 className="text-[clamp(24px,2.8vw,36px)] font-medium leading-[1.12] tracking-[-0.02em] text-foreground text-balance">{r.title}</h3>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">{r.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* Example kits ───────────────────────────────────────────────────────────── */

const EXAMPLES: Array<{ look: KitLook; panel: string; ink: string }> = [
  {
    look: {
      name: "Theo Banks",
      handle: "theolifts",
      niche: "Fitness",
      initials: "TB",
      bg: "#17171a",
      fg: "#f5f0e8",
      accent: "#c9a84c",
      accentFg: "#17171a",
      followers: "112K",
      engagement: "4.1%",
      platform: "instagram",
      rates: [
        { label: "Instagram Reel", price: "$900" },
        { label: "Story set (3)", price: "$380" },
      ],
    },
    panel: "linear-gradient(160deg,#3a3326 0%,#17171a 70%)",
    ink: "#f5f0e8",
  },
  {
    look: {
      name: "Lena Ruiz",
      handle: "lenaroams",
      niche: "Travel",
      initials: "LR",
      bg: "#eef5fb",
      fg: "#1b365d",
      accent: "#005a9c",
      accentFg: "#ffffff",
      followers: "64.5K",
      engagement: "28K",
      platform: "youtube",
      rates: [
        { label: "YouTube integration", price: "$1,100" },
        { label: "Short", price: "$350" },
      ],
    },
    panel: "linear-gradient(160deg,#60c1e5 0%,#1b365d 75%)",
    ink: "#ffffff",
  },
  {
    look: {
      name: "Sana Malik",
      handle: "sanacooks",
      niche: "Food",
      initials: "SM",
      bg: "#f7efe7",
      fg: "#3a2a20",
      accent: "#c97b4b",
      accentFg: "#ffffff",
      followers: "29.8K",
      engagement: "7.2%",
      platform: "instagram",
      rates: [
        { label: "Recipe Reel", price: "$380" },
        { label: "Story set (3)", price: "$160" },
      ],
    },
    panel: "linear-gradient(160deg,#e8b48f 0%,#7a3f22 80%)",
    ink: "#ffffff",
  },
];

/** Example kits by niche: a "portrait" panel (initials, no stock faces) with the kit beside it. */
export function ExampleKits(): ReactNode {
  return (
    <section id="examples" className="scroll-mt-24 py-24 sm:py-32">
      <div className={shell}>
        <Heading title="A kit that looks like your niche">
          Pick a style, connect your account and add your rates. These are examples; yours fills in with your real numbers.
        </Heading>
        <div className="mt-14 grid gap-14 sm:gap-10 md:grid-cols-2 lg:grid-cols-3">
          {EXAMPLES.map(({ look, panel, ink }) => {
            const Icon = look.platform === "instagram" ? SiInstagram : SiYoutube;
            return (
              <div key={look.handle} className="relative pr-20 sm:pr-24" aria-hidden>
                <div className="relative h-[360px] overflow-hidden rounded-[28px] p-6" style={{ background: panel, color: ink }}>
                  <span className="pointer-events-none absolute -left-4 -top-8 font-display text-[190px] font-semibold leading-none opacity-15">
                    {look.initials}
                  </span>
                  <div className="absolute bottom-6 left-6 right-24">
                    <p className="text-2xl font-semibold leading-tight">{look.name}</p>
                    <p className="text-sm opacity-75">@{look.handle}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm opacity-90">
                      <Icon size={13} /> {look.followers} {look.platform === "instagram" ? "followers" : "subscribers"}
                    </p>
                    <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#1b365d]">
                      {look.niche} creator
                    </span>
                  </div>
                  <ExampleTag tone="dark" className="absolute right-4 top-4" />
                </div>
                <div className="absolute -bottom-6 right-0 w-[168px] rotate-3 sm:w-[180px]">
                  <PhoneFrame>
                    <KitMock look={look} compact />
                  </PhoneFrame>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* One link instead of five ───────────────────────────────────────────────── */

/** What creators juggle today vs. where it lives in Kitevo. Prices come from config. */
export function OneLink(): ReactNode {
  const tiers = getPublicTiers();
  const pro = tiers.find((t) => t.id === "pro");
  const rows: Array<{ icon: ReactNode; kitevo: string; instead: string }> = [
    { icon: <Sparkles size={16} />, kitevo: "Live media kit", instead: "A PDF you remake every month" },
    { icon: <TrendingUp size={16} />, kitevo: "Stats synced from Instagram & YouTube", instead: "Screenshots of your Insights" },
    { icon: <Tag size={16} />, kitevo: "Rates on your kit", instead: "A rate card doc you attach to emails" },
    { icon: <Sheet size={16} />, kitevo: "Deal pipeline", instead: "DMs plus a spreadsheet" },
    { icon: <Link2 size={16} />, kitevo: "One shareable link", instead: "A different file for every brand" },
  ];
  return (
    <section className="bg-canvas py-24 sm:py-32">
      <div className={shell}>
        <Heading title="One link instead of five tabs" center>
          The things creators juggle to land a deal, and where each one lives in Kitevo.
        </Heading>
        <div className="mx-auto mt-12 max-w-2xl rounded-[28px] bg-background p-6 shadow-[0_24px_60px_-24px_rgba(27,54,93,0.35)] sm:p-8">
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.kitevo} className="flex items-center gap-4 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">{r.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">{r.kitevo}</span>
                  <span className="block text-sm text-muted-foreground">
                    Instead of: <span className="line-through decoration-muted-foreground/50">{r.instead}</span>
                  </span>
                </span>
                <Check size={18} className="shrink-0 text-primary" aria-hidden />
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary-soft px-5 py-4">
            <span className="font-semibold text-foreground">All of it in Kitevo</span>
            <span className="text-sm text-foreground">
              <span className="font-semibold">Free</span> to start
              {pro ? (
                <>
                  , <span className="font-semibold">{pro.name}</span> ${pro.priceMonthly}/mo
                </>
              ) : null}
            </span>
          </div>
        </div>
        <div className="flex justify-center">
          <StartFree label="Build my kit free" />
        </div>
      </div>
    </section>
  );
}

/* Inbox wall ─────────────────────────────────────────────────────────────── */

/** What a good week looks like, as Kitevo notifications. Illustrative, and labelled so. */
export function InboxWall(): ReactNode {
  const ref = exampleEarnings("pro");
  const card = "mb-5 break-inside-avoid rounded-2xl border border-border bg-background p-5 shadow-[0_14px_36px_-20px_rgba(27,54,93,0.35)]";
  const head = (icon: ReactNode, title: string, when: string) => (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary-soft-foreground">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{when}</span>
      </span>
      <ExampleTag />
    </div>
  );
  return (
    <section className="py-24 sm:py-32">
      <div className={shell}>
        <Heading title="What a good week on Kitevo looks like" center>
          Illustrative notifications, not real accounts. This is the kind of thing that lands in your Kitevo inbox.
        </Heading>
        <div className="mt-14 columns-1 gap-5 sm:columns-2 lg:columns-3" aria-hidden>
          <div className={card}>
            {head(<FileText size={15} />, "New inquiry from Glowfield Skincare", "Monday, 9:12")}
            <p className="mt-4 rounded-xl bg-canvas p-3 text-sm leading-relaxed text-foreground">
              Loved your morning-routine Reel. Would you do 1 Reel + 3 Stories for our SPF launch? Budget is $1,200.
            </p>
          </div>
          <div className={card}>
            {head(<Eye size={15} />, "Your kit was opened 38 times today", "Monday")}
            <div className="mt-4 flex h-14 items-end gap-1.5">
              {[18, 30, 22, 46, 38, 64, 100].map((h, i) => (
                <span key={i} className="flex-1 rounded-sm bg-accent" style={{ height: `${h}%`, opacity: 0.4 + i * 0.09 }} />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Most views came from your Instagram bio.</p>
          </div>
          <div className={card}>
            {head(<BadgeCheck size={15} />, "Accepted for Trail Week", "Tuesday")}
            <p className="mt-3 text-sm text-muted-foreground">Northwind Outdoors accepted your application and sent you a message.</p>
          </div>
          <div className={card}>
            {head(<MessageCircle size={15} />, "Brewbox Coffee", "Wednesday")}
            <p className="mt-4 max-w-[85%] rounded-2xl rounded-tl-sm bg-canvas px-4 py-2.5 text-sm text-foreground">
              Are you free for a story set in March? Happy to send beans first.
            </p>
            <p className="ml-auto mt-2 max-w-[70%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
              Yes! My rates are on my kit.
            </p>
          </div>
          <div className={card}>
            {head(<SquareWon />, "Deal moved to Won", "Thursday")}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-[#22c55e]/40 bg-[#22c55e]/5 px-4 py-3">
              <span className="text-sm font-medium text-foreground">Glowfield Skincare</span>
              <span className="text-lg font-semibold tabular-nums text-[#15803d] dark:text-[#4ade80]">$1,200</span>
            </div>
          </div>
          <div className={card}>
            {head(<CalendarClock size={15} />, "Referral earnings", "Friday")}
            <p className="mt-3 text-sm text-muted-foreground">
              A creator you invited upgraded to {ref.tierName}. You earn{" "}
              <span className="font-semibold text-foreground">${ref.perMonth.toFixed(2)}</span> every month they stay, for a year.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function SquareWon() {
  return <Check size={15} strokeWidth={3} />;
}
