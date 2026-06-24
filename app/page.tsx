import { ReducedMotionProvider } from "@/lib/motion";
import { SmoothScroll } from "@/components/smooth-scroll";
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
        <MarketingNav />
        <main>
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
