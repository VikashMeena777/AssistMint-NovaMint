import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { SectionReveal } from "@/components/marketing/animated-primitives";

// ═══════════════════════════════════════════════
// 10 — FINAL CTA (paper band) — server component
// ═══════════════════════════════════════════════

export function FinalCtaSection() {
  return (
    <section className="rule-y paper py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <SectionReveal>
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Your next customer is messaging right now.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Live in 10 minutes. No credit card required. Cancel anytime.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup?plan=starter"
              className="stamp group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px active:translate-y-0 sm:w-auto"
            >
              Start free trial
              <ArrowRight className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-1 motion-reduce:transform-none" />
            </Link>
            <a
              href="#demo"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 text-sm font-semibold text-foreground shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px active:translate-y-0 sm:w-auto"
            >
              See it answer
              <ArrowDown className="h-4 w-4 text-primary" />
            </a>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
