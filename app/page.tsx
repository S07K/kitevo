import { ReducedMotionProvider } from "@/lib/motion";
import { SmoothScroll } from "@/components/smooth-scroll";
import { LaunchBanner } from "./components/LaunchBanner";
import { MarketingNav } from "./components/landing/MarketingNav";
import { Hero } from "./components/landing/Hero";
import { HowItWorks } from "./components/landing/HowItWorks";
import { IntegrationsStrip } from "./components/landing/IntegrationsStrip";
import { NoCut, WaysToEarn, ExampleKits, OneLink, InboxWall } from "./components/landing/EarnSections";
import { PricingSection } from "./components/landing/PricingSection";
import { ReferralSection } from "./components/landing/ReferralSection";
import { FaqSection } from "./components/landing/FaqSection";
import { FinalCta } from "./components/landing/FinalCta";
import { MarketingFooter } from "./components/landing/MarketingFooter";

export default function Home() {
  return (
    <ReducedMotionProvider>
      <SmoothScroll>
        <LaunchBanner />
        {/* The hero opens on a navy band: the nav starts in its light-on-dark form. */}
        <MarketingNav overDark />
        {/* paddingTop shifts content down by the banner height (0 when hidden). */}
        <main style={{ paddingTop: "var(--ph-banner, 0px)" }}>
          <Hero />
          <NoCut />
          <WaysToEarn />
          <ExampleKits />
          <OneLink />
          <InboxWall />
          <HowItWorks />
          <IntegrationsStrip />
          <ReferralSection />
          <PricingSection />
          <FaqSection />
          <FinalCta />
        </main>
        <MarketingFooter />
      </SmoothScroll>
    </ReducedMotionProvider>
  );
}
