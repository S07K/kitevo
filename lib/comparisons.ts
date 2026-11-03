import { getTierById } from "@/config/subscriptions";

/**
 * "Kitevo vs X" comparison pages (/compare/[slug]). SEO pages, so honesty is the whole job:
 *
 * - Every competitor claim carries a source. `official` = the company's own site or help
 *   centre; `reported` = an independent review we could read (shown as such on the page).
 *   Never state a competitor fact without one, and never claim a competitor *lacks*
 *   something unless their own docs say so.
 * - Say where Kitevo is weaker (e.g. no digital-product sales yet). Update `KITEVO_COMMERCE`
 *   when commerce ships.
 * - Re-check every entry when you edit it and bump CHECKED_ON. Kitevo's own prices come
 *   from config/subscriptions.ts so they can't drift.
 */

export const CHECKED_ON = "3 November 2026";

export type Source = { label: string; url: string; kind: "official" | "reported" };
export type Cell = { text: string; source?: Source };
export type Row = { label: string; kitevo: string; them: Cell };
export type Faq = { q: string; a: string };

/** Shown where we couldn't confirm the competitor's position from their own materials. */
export const UNCONFIRMED = "—";

export type Comparison = {
  slug: string;
  name: string;
  /**
   * Logo: a `thesvg` brand mark where one exists (lib/brand-icons), else the company's own official favicon,
   * downloaded from its website into public/brands/ (never hand-drawn brand art).
   */
  mark: { kind: "icon"; brand: "linktree" | "canva" } | { kind: "image"; src: string };
  /** Which generic sketch illustrates the product type (not a copy of their UI). */
  art: "storefront" | "links" | "allinone" | "static";
  /** One line: what the competitor is, in their own terms. */
  whatTheyAre: string;
  title: string;
  description: string;
  intro: string;
  rows: Row[];
  chooseThem: string[];
  chooseKitevo: string[];
  together?: string;
  faq: Faq[];
};

const free = getTierById("free");
const starter = getTierById("starter");
const pro = getTierById("pro");

/** Kitevo's side, shared by every page (prices from config). */
export const KITEVO = {
  free: `Yes: ${free?.kitsAllowed ?? 1} media kit, free forever`,
  paid: `Starter $${starter?.priceMonthly}/mo ($${starter?.priceYearly}/yr) · Pro $${pro?.priceMonthly}/mo ($${pro?.priceYearly}/yr, ${pro?.kitsAllowed} kits)`,
  dealFees: "0% of your brand deals: brands pay you directly",
  mediaKit: "Yes, it's the core product: a live page with your stats, audience, posts, brands and rates",
  liveStats: "Synced from Instagram and YouTube on Starter and Pro; self-reported numbers on Free are labelled as such",
  rateCard: "Itemised rate card on the kit, with a button that takes brands to your contact form or links",
  inquiries: "Brand contact form on your kit (Pro), with a deal pipeline to track each inquiry",
  campaigns: "Brands post campaigns you can apply to from your Kitevo account",
  domain: "Starter and Pro",
  commerce: "Not yet. Kitevo doesn't sell digital products, courses or bookings today.",
};

const stanPricing: Source = { label: "Stan: pricing (updated 22 Jul 2026)", url: "https://stan.store/blog/stan-store-pricing/", kind: "official" };
const stanDomain: Source = { label: "Stan help centre: custom domains", url: "https://help.stan.store/article/151-can-i-create-a-custom-domain-for-my-stan-store", kind: "official" };
const beaconsPricing: Source = { label: "Beacons help centre: pricing plans", url: "https://help.beacons.ai/en/articles/4695681", kind: "official" };
const linktreeReported: Source = { label: "Linklay: Linktree pricing and seller fees (2026)", url: "https://linklay.io/guides/kb/linktree-seller-fees", kind: "reported" };
const linktreeOfficialPlans: Source = { label: "Linktree help centre: plans", url: "https://intercom.help/linktree-ff524ba1864c/en/articles/5434083-upgrade-plan-and-payment-options", kind: "official" };
const canvaTemplates: Source = { label: "Canva: media kit templates", url: "https://www.canva.com/media-kits/templates/", kind: "official" };

export const COMPARISONS: Comparison[] = [
  {
    slug: "stan-store",
    mark: { kind: "image", src: "/brands/stan.png" },
    art: "storefront",
    name: "Stan Store",
    whatTheyAre: "a link-in-bio storefront for selling digital products, courses, memberships and bookings",
    title: "Kitevo vs Stan Store: media kit or storefront?",
    description:
      "An honest comparison of Kitevo and Stan Store for creators: what each is for, pricing, fees, media kits and brand deals, with sources.",
    intro:
      "Stan Store is built to sell things to your audience. Kitevo is built to win brand deals: a live media kit, rates and a pipeline for brand inquiries. They solve different problems, and plenty of creators use both.",
    rows: [
      { label: "What it's for", kitevo: "Winning brand deals: media kit, rates, brand inquiries, campaigns", them: { text: "Selling to your audience: digital products, courses, memberships, bookings", source: stanPricing } },
      { label: "Free plan", kitevo: KITEVO.free, them: { text: "No. A 14-day free trial, then a paid plan", source: stanPricing } },
      { label: "Paid plans", kitevo: KITEVO.paid, them: { text: "Creator $29/mo ($300/yr) · Creator Pro $99/mo ($948/yr)", source: stanPricing } },
      { label: "Fees", kitevo: KITEVO.dealFees, them: { text: "0% transaction fees on sales; Stripe/PayPal processing applies", source: stanPricing } },
      { label: "Media kit with live stats", kitevo: KITEVO.liveStats, them: { text: UNCONFIRMED } },
      { label: "Rate card for brands", kitevo: KITEVO.rateCard, them: { text: UNCONFIRMED } },
      { label: "Brand inquiries", kitevo: KITEVO.inquiries, them: { text: UNCONFIRMED } },
      { label: "Sell digital products", kitevo: KITEVO.commerce, them: { text: "Yes: downloads, courses, memberships, bookings", source: stanPricing } },
      { label: "Custom domain", kitevo: KITEVO.domain, them: { text: "On the higher Creator Max plan; Creator and Creator Pro use stan.store/yourname", source: stanDomain } },
    ],
    chooseThem: [
      "You mainly earn by selling digital products, courses or coaching to your own audience.",
      "You want email marketing, upsells and affiliate tools in the same place (Creator Pro).",
    ],
    chooseKitevo: [
      "You want brand deals and need a media kit brands can trust, with numbers synced from your accounts.",
      "You want to show your rates and get brand inquiries in one place, and track them as deals.",
      "You want to start free, or pay less while you're growing.",
    ],
    together:
      "Many creators use both: their Stan link sells to fans, their Kitevo link goes in pitches and the 'business inquiries' line of their bio.",
    faq: [
      { q: "Is Kitevo a Stan Store alternative?", a: "For brand deals, yes. For selling digital products, not yet: Kitevo doesn't sell products, courses or bookings today. If selling to your audience is your main income, Stan does that and Kitevo doesn't." },
      { q: "Does Stan Store have a free plan?", a: "No. Stan offers a 14-day free trial and then a paid plan, according to its pricing page. Kitevo has a free plan with one media kit." },
      { q: "Can I use Kitevo and Stan together?", a: "Yes. Put your Kitevo media kit link wherever brands look (your bio's business line, pitch emails) and keep your Stan link for fans." },
    ],
  },
  {
    slug: "linktree",
    mark: { kind: "icon", brand: "linktree" },
    art: "links",
    name: "Linktree",
    whatTheyAre: "a link-in-bio page that collects all your links in one place",
    title: "Kitevo vs Linktree: a media kit vs a link-in-bio",
    description: "Kitevo vs Linktree for creators who want brand deals: what each does, plans, fees and media kits, with sources.",
    intro:
      "Linktree puts all your links on one page for anyone who taps your bio. Kitevo is the page you send to brands: your live stats, audience, past partners and rates, with a way to get in touch. Different audiences, different jobs.",
    rows: [
      { label: "What it's for", kitevo: "The page you send brands: stats, audience, rates, inquiries", them: { text: "One page for all your links, for anyone who taps your bio", source: linktreeOfficialPlans } },
      { label: "Free plan", kitevo: KITEVO.free, them: { text: "Yes", source: linktreeOfficialPlans } },
      { label: "Paid plans", kitevo: KITEVO.paid, them: { text: "Starter, Pro and Premium; reported at $8, $15 and $35/mo billed monthly in 2026", source: linktreeReported } },
      { label: "Fees", kitevo: KITEVO.dealFees, them: { text: "Reported seller fee on digital sales: 12% Free, 9% Starter/Pro, 0% Premium", source: linktreeReported } },
      { label: "Media kit with live stats", kitevo: KITEVO.liveStats, them: { text: UNCONFIRMED } },
      { label: "Rate card for brands", kitevo: KITEVO.rateCard, them: { text: UNCONFIRMED } },
      { label: "Brand inquiries", kitevo: KITEVO.inquiries, them: { text: UNCONFIRMED } },
      { label: "Sell digital products", kitevo: KITEVO.commerce, them: { text: "Yes, with the seller fees above", source: linktreeReported } },
    ],
    chooseThem: ["You need one simple page for all your links, for every follower who taps your bio.", "You want lots of link types and integrations."],
    chooseKitevo: [
      "You're pitching brands and want them to see real numbers, your audience and your rates.",
      "You want brand inquiries to arrive in one place instead of your DMs.",
    ],
    together: "Common setup: Linktree (or any link-in-bio) for followers, with a 'Work with me' link to your Kitevo kit for brands.",
    faq: [
      { q: "Is Kitevo a Linktree alternative?", a: "Not exactly. Linktree is for all your followers; Kitevo is for brands. Many creators keep their link-in-bio and add their Kitevo kit as the 'Work with me' link." },
      { q: "How much does Linktree cost?", a: "Linktree has a free plan and paid Starter, Pro and Premium plans. Independent reviews in 2026 report $8, $15 and $35 a month billed monthly. Check linktr.ee for the current prices." },
      { q: "Does Kitevo take a cut of my brand deals?", a: "No. Brands pay you directly and Kitevo takes 0% of your deals." },
    ],
  },
  {
    slug: "beacons",
    mark: { kind: "image", src: "/brands/beacons.png" },
    art: "allinone",
    name: "Beacons",
    whatTheyAre: "an all-in-one creator platform: link-in-bio, store, email and a media kit",
    title: "Kitevo vs Beacons: which media kit should you use?",
    description: "Kitevo vs Beacons for creators: media kits, brand deals, pricing and fees, with sources from Beacons' own help centre.",
    intro:
      "Beacons bundles a link-in-bio, a store, email marketing and a media kit, with a free plan. Kitevo focuses on one job, the brand-deal side: a live media kit, rates, a brand inquiry pipeline and campaigns you can apply to.",
    rows: [
      { label: "What it's for", kitevo: "Brand deals: media kit, rates, inquiries, campaigns", them: { text: "All-in-one: link-in-bio, store, email, media kit", source: beaconsPricing } },
      { label: "Free plan", kitevo: KITEVO.free, them: { text: "Yes, including a media kit", source: beaconsPricing } },
      { label: "Paid plans", kitevo: KITEVO.paid, them: { text: "Creator $10/mo · Creator Plus $30/mo · Creator Max $100/mo (annual options)", source: beaconsPricing } },
      { label: "Fees", kitevo: KITEVO.dealFees, them: { text: "9% seller fee on Free and Creator (invoices 0%); 0% on Creator Plus and Max", source: beaconsPricing } },
      { label: "Media kit", kitevo: KITEVO.mediaKit, them: { text: "Yes, on the free plan", source: beaconsPricing } },
      { label: "Rate card for brands", kitevo: KITEVO.rateCard, them: { text: UNCONFIRMED } },
      { label: "Brand inquiries", kitevo: KITEVO.inquiries, them: { text: UNCONFIRMED } },
      { label: "Sell digital products", kitevo: KITEVO.commerce, them: { text: "Yes, with the seller fees above", source: beaconsPricing } },
      { label: "Custom domain", kitevo: KITEVO.domain, them: { text: "Creator Max", source: beaconsPricing } },
    ],
    chooseThem: ["You want one tool for your link-in-bio, store, email list and media kit.", "Selling products matters as much to you as brand deals."],
    chooseKitevo: [
      "Brand deals are your focus, and you want the kit, rates, inquiries and campaigns built around them.",
      "You want a media kit that reads as a pitch: an audience summary up top, live stats and a clear way to book you.",
    ],
    faq: [
      { q: "Is Beacons' media kit free?", a: "Beacons' help centre lists a customisable media kit on its free plan. Kitevo's media kit is free too, with live stats on Starter and Pro." },
      { q: "Does Beacons take a fee?", a: "Beacons' help centre lists a 9% seller fee on the Free and Creator plans (0% on invoices) and 0% on Creator Plus and Creator Max. Kitevo takes 0% of your brand deals." },
    ],
  },
  {
    slug: "canva-media-kit",
    mark: { kind: "icon", brand: "canva" },
    art: "static",
    name: "a Canva media kit",
    whatTheyAre: "a design tool with free media kit templates you fill in and export",
    title: "Kitevo vs a Canva media kit: live page or static PDF?",
    description: "Canva media kit template or a live Kitevo media kit? What changes when your stats update themselves, with sources.",
    intro:
      "A Canva template is a great way to make a good-looking media kit fast, and it's free. The catch is that it's a snapshot: you type your numbers in, and they're out of date by next month. Kitevo is a live page whose numbers sync from your accounts.",
    rows: [
      { label: "What it is", kitevo: "A live web page at your own link", them: { text: "A design you fill in and export (PDF, image or link)", source: canvaTemplates } },
      { label: "Price", kitevo: KITEVO.free, them: { text: "Free templates; some need a paid Canva plan", source: canvaTemplates } },
      { label: "Stats", kitevo: KITEVO.liveStats, them: { text: "Typed in by you, so they're as current as your last edit" } },
      { label: "Updating it", kitevo: "Numbers update themselves on Starter and Pro; edit everything else in one editor", them: { text: "Edit the design and re-export" } },
      { label: "Rates", kitevo: KITEVO.rateCard, them: { text: "Any text you add" } },
      { label: "Brand inquiries", kitevo: KITEVO.inquiries, them: { text: "Your email address on the page" } },
      { label: "Design freedom", kitevo: "Choose from kit styles; layout is fixed so it always reads well", them: { text: "Full design freedom", source: canvaTemplates } },
      { label: "Export", kitevo: "Share the link, or download as PowerPoint", them: { text: "PDF, image and more", source: canvaTemplates } },
    ],
    chooseThem: ["You want full control over every pixel of the design.", "You need a one-off PDF and your numbers won't change soon."],
    chooseKitevo: [
      "You pitch brands regularly and don't want to re-export a PDF every time your numbers move.",
      "You want brands to trust the numbers: synced from Instagram and YouTube, not typed in.",
    ],
    faq: [
      { q: "Is a Canva media kit good enough?", a: "For a first pitch, often yes. The weakness is freshness: brands increasingly ask for current numbers, and a static file can't show them. A live kit stays current without re-exporting." },
      { q: "Can I keep my Canva design?", a: "Yes. Some creators keep a Canva one-pager for decks and send their Kitevo link for the live numbers." },
    ],
  },
];

export const comparisonBySlug = (slug: string) => COMPARISONS.find((c) => c.slug === slug) ?? null;
