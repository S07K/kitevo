/**
 * What Kitevo connects to, for the public /integrations page and the landing strip.
 * Client-safe data only. Keep it honest: `status: "live"` only for shipped code, plan labels
 * must match config/subscriptions.ts, and data-use lines must match what the code reads
 * (Kitevo only reads platform data; it never posts, edits or deletes).
 */

export type IntegrationLogo = "instagram" | "youtube" | "razorpay" | "stripe" | "paypal" | "googledrive" | "dropbox" | "notion" | "calendly" | "calcom" | "googlecalendar" | "groq" | "openrouter" | "openai" | "gemini" | "anthropic" | "domain";

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
        status: "live",
        plans: "Starter and Pro",
        summary: "Cards and the wallets your Stripe account accepts, on Stripe's own checkout page, paid into your Stripe account. Works for buyers anywhere.",
        details: ["Connect with a restricted key that can only create checkouts (stored encrypted)", "Every payment is verified with Stripe before the buyer gets the file", "Connect Razorpay too and buyers choose at checkout"],
      },
      {
        id: "paypal",
        name: "PayPal",
        status: "live",
        plans: "Starter and Pro",
        summary: "Buyers pay with their PayPal balance or card on PayPal's own page, into your PayPal account. For USD products.",
        details: ["Connect with your own PayPal app's Client ID and Secret (stored encrypted)", "Every payment is captured and checked with PayPal before the buyer gets the file", "PayPal doesn't take INR, so INR products use Razorpay or Stripe"],
      },
    ],
  },
  {
    id: "calls",
    title: "Book a call",
    intro: "A Book a call button on your kit that opens the scheduler you already use. Your availability, calendar conflicts and reminders stay there.",
    items: [
      { id: "calendly", name: "Calendly", status: "live", plans: "Every plan", summary: "A Book a call button on your kit that opens your Calendly, so people book without leaving.", details: ["Connect once by pasting your Calendly link", "Bookings and reminders stay in Calendly"] },
      { id: "calcom", name: "Cal.com", status: "live", plans: "Every plan", summary: "A Book a call button on your kit that opens your Cal.com event.", details: ["Connect once by pasting your Cal.com link", "Bookings and reminders stay in Cal.com"] },
      { id: "googlecalendar", name: "Google Calendar", status: "live", plans: "Every plan", summary: "A Book a call button on your kit that opens your Google Calendar appointment schedule.", details: ["Paste your appointment schedule's booking link", "Bookings land straight in your Google Calendar"] },
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
    id: "ai",
    title: "AI for Copilot",
    intro: "Copilot drafts your bio, campaign pitches and replies to brand inquiries from your kit's real numbers. It runs on Kitevo's AI with Pro, or on your own AI account on any plan.",
    items: [
      { id: "groq", name: "Groq", status: "live", plans: "Every plan, your own key", summary: "Fast open models (Llama, Qwen) with a free tier.", details: ["Paste an API key from the Groq console (stored encrypted)", "Pick any model your account can use"] },
      { id: "openrouter", name: "OpenRouter", status: "live", plans: "Every plan, your own key", summary: "One key for hundreds of models, including free ones.", details: ["Paste an API key from OpenRouter (stored encrypted)", "Free models end in :free"] },
      { id: "openai", name: "OpenAI", status: "live", plans: "Every plan, your own key", summary: "GPT models, billed to your OpenAI account.", details: ["Paste an API key from the OpenAI platform (stored encrypted)"] },
      { id: "gemini", name: "Google Gemini", status: "live", plans: "Every plan, your own key", summary: "Gemini models with a free tier in Google AI Studio.", details: ["Paste an API key from Google AI Studio (stored encrypted)"] },
      { id: "anthropic", name: "Anthropic", status: "live", plans: "Every plan, your own key", summary: "Claude models, billed to your Anthropic account.", details: ["Paste an API key from the Anthropic console (stored encrypted)"] },
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
