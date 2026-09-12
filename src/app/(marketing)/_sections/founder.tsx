import Link from "next/link";
import { SectionReveal } from "@/components/marketing/animated-primitives";
import { ElevateCard } from "@/components/marketing/section-bits";

// ═══════════════════════════════════════════════
// 9 — FOUNDER CARD (server component)
// ═══════════════════════════════════════════════

export function FounderSection() {
  return (
    <section className="pb-20 sm:pb-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <ElevateCard>
            <div className="flex flex-col items-center gap-6 rounded-2xl border bg-card p-8 text-center shadow-sm sm:flex-row sm:text-left">
              <div className="grid size-14 shrink-0 place-items-center rounded-full bg-primary font-heading text-xl font-semibold text-primary-foreground">
                V
              </div>
              <div className="flex-1">
                <p className="text-base font-medium leading-relaxed text-foreground">
                  Built by a founder who sets up every shop personally. Message me
                  before you pay anything.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Vikash — Founder, AssistMint
                </p>
              </div>
              <Link
                href="/contact"
                className="stamp inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px active:translate-y-0"
              >
                Talk to us
              </Link>
            </div>
          </ElevateCard>
        </SectionReveal>
      </div>
    </section>
  );
}
