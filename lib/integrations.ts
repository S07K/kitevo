/**
 * What Kitevo connects to, for the public /integrations page and the landing strip.
 * Client-safe data only. Keep it honest: `status: "live"` only for shipped code, plan labels
 * must match config/subscriptions.ts, and data-use lines must match what the code reads
 * (Kitevo only reads platform data; it never posts, edits or deletes).
 */

export type IntegrationLogo = "instagram" | "youtube" | "razorpay" | "stripe" | "paypal" | "googledrive" | "dropbox" | "notion" | "domain";

export type Integration = {
  id: IntegrationLogo;
  name: string;
  status: "live" | "soon";
  /** Which plans can use it. */
  plans: string;
  /** One sentence: what it does for the creator. */
  summary: string;
  /** Specific bullets: what Kitevo reads / does / needs. */
  details: string[];
  link?: { label: string; href: string };
};

export type IntegrationGroup = { id: string; title: string; intro: string; items: Integration[] };

export const INTEGRATION_GROUPS: IntegrationGroup[] = [
  {
    id: "stats",
    title: "Live stats on your kit",
    intro: "Connect once and your kit keeps itself current. Kitevo only reads these numbers; it never posts, edits or deletes anything on your accounts.",
    items: [
      {
        id: "instagram",
        name: "Instagram",
        status: "live",
        plans: "Starter and Pro",
        summary: "Followers, engagement and audience, synced from Instagram instead of typed in.",
        details: [
          "Followers, engagement rate and per-post averages",
          "Your recent posts, shown on the kit",
          "Audience age, gender and top countries",
          "30-day follower growth chart",
          "Needs a Professional (Business or Creator) account connected to a Facebook Page",
        ],
        link: { label: "Instagram setup help", href: "/help/instagram" },
      },
      {
        id: "youtube",
        name: "YouTube",
        status: "live",
        plans: "Starter and Pro",
        summary: "Subscribers, views and your latest videos, read straight from your channel.",
        details: ["Subscribers and average views per video", "Your recent videos, playable on the kit", "Read-only access to your channel"],
      },
    ],
  },
  {
    id: "payments",
    title: "Get paid for digital products",
    intro: "Buyers pay you directly, into your own account. Kitevo takes 0% of your sales and never holds your money.",
    items: [
      {
        id: "razorpay",
        name: "Razorpay",
        status: "live",
        plans: "Starter and Pro",
        summary: "Sell products from your kit with Razorpay Checkout (UPI, cards and the other methods your Razorpay account accepts), paid into your account.",
        details: ["Connect with your own Razorpay API keys (stored encrypted)", "Every payment is verified before the buyer gets the file", "Buyers get a private download page and an email receipt"],
      },
      {
        id: "stripe",
        name: "Stripe",
        status: "soon",
        plans: "Starter and Pro",
        summary: "Card payments into your own Stripe account, for creators selling outside India.",
        details: ["Same model: your account, your money, 0% to Kitevo"],
      },
      {
        id: "paypal",
        name: "PayPal",
        status: "soon",
        plans: "Starter and Pro",
        summary: "Let buyers pay with their PayPal balance, into your PayPal account.",
        details: ["Same model: your account, your money, 0% to Kitevo"],
      },
    ],
  },
  {
    id: "delivery",
    title: "Deliver your files",
    intro: "Keep files where they already live. Paste a share link; buyers only see it on their private download page.",
    items: [
      { id: "googledrive", name: "Google Drive", status: "live", plans: "Every plan", summary: "PDFs, presets, templates: share the file and paste the link.", details: ["Set sharing to “anyone with the link”"] },
      { id: "dropbox", name: "Dropbox", status: "live", plans: "Every plan", summary: "Share a file or folder link for bigger downloads.", details: ["Works for single files and whole folders"] },
      { id: "notion", name: "Notion", status: "live", plans: "Every plan", summary: "Guides and resource lists as a published Notion page.", details: ["Publish the page to the web, then paste its link"] },
    ],
  },
  {
    id: "domain",
    title: "Your own address",
    intro: "Put your kit on a domain you own.",
    items: [
      {
        id: "domain",
        name: "Custom domain",
        status: "live",
        plans: "Starter and Pro",
        summary: "Show your kit at kit.yourname.com, with HTTPS set up for you.",
        details: ["Add one DNS record at your domain provider", "Works with any registrar"],
      },
    ],
  },
];
