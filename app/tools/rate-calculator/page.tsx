import type { Metadata } from "next";
import { Suspense } from "react";
import { ToolPage, type Faq } from "../ToolPage";
import { RateCalculator } from "./RateCalculator";
import { ADD_ONS, BASE_RATE_PER_1K, DELIVERABLES, NICHE_FACTOR, PLATFORM_LABEL, type Platform } from "@/lib/creator-calculators";

export const metadata: Metadata = {
  title: "Influencer Rate Calculator: What Should I Charge? · Kitevo",
  description:
    "Free rate calculator for Instagram, TikTok and YouTube creators. Enter your followers or views and get a price range for posts, Reels, Stories and videos, with the formula shown.",
  alternates: { canonical: "/tools/rate-calculator" },
  openGraph: { title: "Influencer rate calculator", description: "What should you charge for a sponsored post? Free, no sign-up.", url: "/tools/rate-calculator" },
};

const FAQ: Faq[] = [
  {
    q: "How much should I charge for a sponsored post?",
    a: "A common starting point on Instagram is about $10 for every 1,000 followers per feed post, so roughly $100 at 10k followers and $500 at 50k. Reels usually cost more and Stories less. Adjust for your engagement, your niche and what the brand wants to do with the content.",
  },
  {
    q: "Why does TikTok and YouTube use views instead of followers?",
    a: "On TikTok and YouTube most views come from recommendations rather than followers, so your typical views per video are a better guide to what a brand gets than your follower or subscriber count.",
  },
  {
    q: "Is this what other creators are actually charging?",
    a: "No. These are rule-of-thumb formulas, not survey data, and real deals vary a lot. Treat the range as a starting point for your first quote, then raise it as brands say yes.",
  },
  {
    q: "What are usage rights and exclusivity?",
    a: "Usage rights let a brand run your content as its own ads; exclusivity stops you working with its competitors for a set time. Both cost you something, so charge extra for them. We add 30% and 25%; many creators charge more for long periods.",
  },
  {
    q: "Should I put my rates on my media kit?",
    a: "Showing a starting price saves back-and-forth and filters out brands with no budget. On Kitevo you can show an itemised rate card on your kit, next to stats synced from Instagram and YouTube.",
  },
];

const PLATFORMS: Platform[] = ["instagram", "tiktok", "youtube"];

export default function RateCalculatorPage() {
  return (
    <ToolPage
      path="/tools/rate-calculator"
      name="Rate calculator"
      title="What should I charge? Influencer rate calculator"
      intro="Get a price range for sponsored posts, Reels, Stories and videos on Instagram, TikTok and YouTube. Free, no sign-up, and the formula is right below."
      tool={
        <Suspense>
          <RateCalculator />
        </Suspense>
      }
      method={{
        title: "How the estimate works",
        body: (
          <>
            <p>
              This is a rule-of-thumb formula, not market data. It&apos;s meant to give you a sensible first quote. Every number it uses is
              listed here.
            </p>
            <p>
              <strong>1. A base rate.</strong> Instagram is priced per 1,000 followers; TikTok and YouTube per 1,000 average views:
            </p>
            <table>
              <thead>
                <tr><th>Platform</th><th>Reference deliverable</th><th>Base rate</th></tr>
              </thead>
              <tbody>
                {PLATFORMS.map((p) => (
                  <tr key={p} className="border-t border-border">
                    <td>{PLATFORM_LABEL[p]}</td>
                    <td>{DELIVERABLES[p].find((d) => d.multiplier === 1)?.label}</td>
                    <td>${BASE_RATE_PER_1K[p]} per 1,000 {p === "instagram" ? "followers" : "views"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>
              <strong>2. The deliverable.</strong> Other formats scale from the reference:{" "}
              {PLATFORMS.flatMap((p) => DELIVERABLES[p].filter((d) => d.multiplier !== 1)).map((d) => `${d.label} ×${d.multiplier}`).join(", ")}.
            </p>
            <p>
              <strong>3. Engagement.</strong> Your rate is compared with what&apos;s typical for your audience size (engagement falls as accounts
              grow). Higher engagement raises the price and lower reduces it, by at most 35% up or 25% down. If you leave it blank, nothing changes.
            </p>
            <p>
              <strong>4. Niche.</strong> Brands with valuable customers pay more:{" "}
              {Object.entries(NICHE_FACTOR).filter(([, f]) => f > 1).map(([n, f]) => `${n} ×${f}`).join(", ")}; lower for{" "}
              {Object.entries(NICHE_FACTOR).filter(([, f]) => f < 1).map(([n]) => n).join(", ")}. Others are unchanged.
            </p>
            <p>
              <strong>5. Extras.</strong> {ADD_ONS.usageRights.label}: ×{ADD_ONS.usageRights.factor}. {ADD_ONS.exclusivity.label}: ×{ADD_ONS.exclusivity.factor}.
            </p>
            <p>
              The range is 75% to 130% of the result, rounded to numbers people actually quote, with a $20 minimum.
            </p>
          </>
        ),
      }}
      faq={FAQ}
      related={{ href: "/tools/engagement-rate-calculator", label: "Engagement rate calculator", body: "Find your engagement rate and see how it compares with accounts your size." }}
    />
  );
}
