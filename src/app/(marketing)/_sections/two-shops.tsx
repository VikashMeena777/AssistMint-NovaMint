import { Check, X } from "lucide-react";
import {
  SectionReveal,
  StaggerItem as CardStaggerItem,
} from "@/components/marketing/animated-primitives";
import { Eyebrow, ElevateCard } from "@/components/marketing/section-bits";

// ═══════════════════════════════════════════════
// 3 — ONE TUESDAY, TWO SHOPS (before/after)
//     Server component on a subtle secondary band.
// ═══════════════════════════════════════════════

export function TwoShopsSection() {
  return (
    <section className="rule-y bg-secondary/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <Eyebrow index="01">The problem</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              One Tuesday. Two shops.
            </h2>
          </div>
        </SectionReveal>

        <div className="grid gap-5 md:grid-cols-2">
          {/* WITHOUT MINT — muted */}
          <CardStaggerItem>
            <ElevateCard className="h-full">
              <div className="h-full rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="font-mono text-sm font-semibold text-muted-foreground">
                    9:47 PM
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Without Mint
                  </span>
                </div>
                <ul className="mt-4 space-y-3">
                  {[
                    "6 customer messages sit unread",
                    "2 tables lost to the place next door",
                    "1 bad review — “never replies on WhatsApp”",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" strokeWidth={2.5} />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </ElevateCard>
          </CardStaggerItem>

          {/* WITH MINT — cobalt */}
          <CardStaggerItem>
            <ElevateCard className="h-full">
              <div className="h-full rounded-2xl border border-primary/40 bg-card p-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="font-mono text-sm font-semibold text-foreground">9:47 PM</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                    With Mint
                  </span>
                </div>
                <ul className="mt-4 space-y-3">
                  {[
                    "6 replies sent — within seconds",
                    "2 tables booked for tonight, 9:00 pm",
                    "₹0 commission on every order",
                  ].map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </ElevateCard>
          </CardStaggerItem>
        </div>

        <SectionReveal delay={0.1}>
          <p className="mt-8 text-center text-sm font-medium text-muted-foreground">
            The difference costs less than a cutting chai a day.
          </p>
        </SectionReveal>
      </div>
    </section>
  );
}
