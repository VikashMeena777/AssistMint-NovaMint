import { Check, X } from "lucide-react";
import { SectionReveal } from "@/components/marketing/animated-primitives";
import { Eyebrow } from "@/components/marketing/section-bits";

// ═══════════════════════════════════════════════
// 7 — WHAT MINT WILL NEVER DO (trust contract)
//     Server component on a subtle secondary band.
// ═══════════════════════════════════════════════

const PROMISES = [
  { bad: true, text: "Never message your customers without you" },
  { bad: true, text: "Never share your data" },
  { bad: false, text: "Hands over to you the moment it's unsure" },
  { bad: false, text: "Cancel anytime — you keep your number" },
];

export function NeverDoSection() {
  return (
    <section className="rule-y bg-secondary/40 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mb-10 text-center">
            <Eyebrow index="05">Our promises</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              What Mint will never do.
            </h2>
          </div>
        </SectionReveal>

        <SectionReveal delay={0.05}>
          <ul className="rule-y divide-y divide-border">
            {PROMISES.map((p) => (
              <li key={p.text} className="flex items-center gap-3.5 py-4">
                {p.bad ? (
                  <X className="h-4 w-4 shrink-0 text-destructive" strokeWidth={2.5} />
                ) : (
                  <Check className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.5} />
                )}
                <span className="text-sm font-medium text-foreground">{p.text}</span>
              </li>
            ))}
          </ul>
        </SectionReveal>
      </div>
    </section>
  );
}
