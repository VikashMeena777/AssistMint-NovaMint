import { SmoothHashScroll } from "@/components/marketing/smooth-hash-scroll";
import { HeroSection } from "./_sections/hero";
import { TrustStrip } from "./_sections/trust-strip";
import { TwoShopsSection } from "./_sections/two-shops";
import { HowItWorksSection } from "./_sections/how-it-works";
import { VerticalSwitcherSection } from "./_sections/vertical-switcher";
import { RealConversationsSection } from "./_sections/real-conversations";
import { NeverDoSection } from "./_sections/never-do";
import { PricingSection } from "./_sections/pricing";
import { FounderSection } from "./_sections/founder";
import { FinalCtaSection } from "./_sections/final-cta";
import { FAQSection } from "./_sections/faq";

// Landing page — a thin SERVER component. Static sections ship zero JS;
// interactivity lives in small client islands (thread demo, word swap,
// vertical switcher, pricing toggle, FAQ accordions) so the heavy chunks
// never block first paint.
export default function HomePage() {
  return (
    <div className="bg-background">
      <SmoothHashScroll />
      <HeroSection />
      <TrustStrip />
      <TwoShopsSection />
      <HowItWorksSection />
      <VerticalSwitcherSection />
      <RealConversationsSection />
      <NeverDoSection />
      <PricingSection />
      <FounderSection />
      <FinalCtaSection />
      <FAQSection />
    </div>
  );
}
