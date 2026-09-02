import { ReducedMotionProvider } from "@/lib/motion";
import { SmoothScroll } from "@/components/smooth-scroll";
import { LaunchBanner } from "./components/LaunchBanner";
import { MarketingNav } from "./components/landing/MarketingNav";
import { Hero } from "./components/landing/Hero";
import { HowItWorks } from "./components/landing/HowItWorks";
import { VibesShowcase } from "./components/landing/VibesShowcase";
import { Testimonials } from "./components/landing/Testimonials";
import { PricingSection } from "./components/landing/PricingSection";
import { FaqSection } from "./components/landing/FaqSection";
import { FinalCta } from "./components/landing/FinalCta";
import { MarketingFooter } from "./components/landing/MarketingFooter";

export default function Home() {
  return (
    <ReducedMotionProvider>
      <SmoothScroll>
        <LaunchBanner />
        <MarketingNav />
        {/* paddingTop shifts content down by the banner height (0 when hidden). */}
        <main style={{ paddingTop: "var(--ph-banner, 0px)" }}>
          <Hero />
          <HowItWorks />
          <VibesShowcase />
          <Testimonials />
          <PricingSection />
          <FaqSection />
          <FinalCta />
        </main>
        <MarketingFooter />
      </SmoothScroll>
    </ReducedMotionProvider>
  );
}
