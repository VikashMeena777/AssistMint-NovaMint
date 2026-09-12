import {
  SectionReveal,
  StaggerContainer,
  StaggerItem as CardStaggerItem,
} from "@/components/marketing/animated-primitives";
import { Eyebrow } from "@/components/marketing/section-bits";

// ═══════════════════════════════════════════════
// 4 — HOW IT WORKS: 3 steps, mono badges (server component)
// ═══════════════════════════════════════════════

const STEPS = [
  { n: "01", text: "Share your menu or services" },
  { n: "02", text: "Mint learns your prices, timings, delivery areas" },
  { n: "03", text: "It answers 24×7 — you check the morning report" },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <Eyebrow index="02">Setup</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Live on WhatsApp in 10 minutes.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              No consultants, no code, no new hardware. If you can send a
              WhatsApp message, you can run this.
            </p>
          </div>
        </SectionReveal>

        <StaggerContainer className="grid gap-8 md:grid-cols-3" staggerDelay={0.08}>
          {STEPS.map((step) => (
            <CardStaggerItem key={step.n}>
              <div className="flex items-start gap-4">
                <span className="shrink-0 rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-sm font-bold text-primary">
                  {step.n}
                </span>
                <p className="pt-1 text-sm font-medium leading-relaxed text-foreground">
                  {step.text}
                </p>
              </div>
            </CardStaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
