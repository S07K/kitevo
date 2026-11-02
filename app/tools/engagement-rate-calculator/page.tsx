import type { Metadata } from "next";
import { ToolPage, type Faq } from "../ToolPage";
import { EngagementCalculator } from "./EngagementCalculator";

export const metadata: Metadata = {
  title: "Engagement Rate Calculator for Instagram, TikTok & YouTube · Kitevo",
  description:
    "Free engagement rate calculator. Enter your average likes, comments and followers or views to get your engagement rate and see how it compares with accounts your size.",
  alternates: { canonical: "/tools/engagement-rate-calculator" },
  openGraph: { title: "Engagement rate calculator", description: "Your engagement rate in 10 seconds. Free, no sign-up.", url: "/tools/engagement-rate-calculator" },
};

const FAQ: Faq[] = [
  {
    q: "How do you calculate engagement rate?",
    a: "Add up the average likes, comments (and saves or shares if you have them) per post, divide by your followers, and multiply by 100. On YouTube, and on TikTok when you know your views, divide by average views instead.",
  },
  {
    q: "What is a good engagement rate on Instagram?",
    a: "It depends on size, because engagement falls as accounts grow. As a rough guide we treat about 4% as typical under 10k followers, around 2–3% from 10k to 100k, and 1–1.5% for accounts with hundreds of thousands or millions of followers.",
  },
  {
    q: "Why per view on YouTube and TikTok?",
    a: "Most views on those platforms come from recommendations, not followers, so interactions per view say more about how a video landed than interactions per follower.",
  },
  {
    q: "Where do the 'typical' numbers come from?",
    a: "They're rough rules of thumb that vary by niche and change over time, not figures from a specific study. Use them as a sense check, not a grade.",
  },
  {
    q: "Do brands care about engagement rate?",
    a: "Yes. It's one of the first numbers brands check, alongside audience location and age. A Kitevo media kit shows engagement synced from Instagram, so brands don't have to trust a screenshot.",
  },
];

export default function EngagementRateCalculatorPage() {
  return (
    <ToolPage
      path="/tools/engagement-rate-calculator"
      name="Engagement rate calculator"
      title="Engagement rate calculator"
      intro="Work out your engagement rate on Instagram, TikTok or YouTube in about 10 seconds, and see how it compares with accounts your size. Free, no sign-up."
      tool={<EngagementCalculator />}
      method={{
        title: "How it's calculated",
        body: (
          <>
            <p>
              <strong>Instagram:</strong> likes + comments + saves and shares, divided by followers, times 100, using averages per post.
            </p>
            <p>
              <strong>TikTok:</strong> likes + comments + shares, divided by average views (or by followers if you leave views blank), times 100.
            </p>
            <p>
              <strong>YouTube:</strong> likes + comments, divided by average views, times 100.
            </p>
            <p>
              <strong>Typical for your size</strong> is a rough rule of thumb, not survey data. Instagram, per follower: 4% under 10k, 3% up to
              50k, 2.2% up to 100k, 1.6% up to 500k, 1.3% up to 1M, 1% above. TikTok per follower runs higher (6% down to 3%); per view we use
              6% for TikTok and 4% for YouTube.
            </p>
            <p>
              Under 60% of typical reads as low, 60–90% as a little below, 90–150% as healthy and anything above as strong.
            </p>
          </>
        ),
      }}
      faq={FAQ}
      related={{ href: "/tools/rate-calculator", label: "Rate calculator", body: "Turn your followers, views and engagement into a price range for every deliverable." }}
    />
  );
}
