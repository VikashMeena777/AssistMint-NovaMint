import { Check, X } from "lucide-react";
import { SectionReveal } from "@/components/marketing/animated-primitives";
import { Eyebrow } from "@/components/marketing/section-bits";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════
// 8 — PRICING: server shell (heading + comparison table) with the
//     interactive billing toggle + plan cards as a client island.
// ═══════════════════════════════════════════════

type Cell = string | boolean | null;

const COMPARISON: { label: string; values: Cell[] }[] = [
  { label: "Monthly cost", values: ["₹499+", "₹15,000+", "Free, but…", "22–30% commission"] },
  { label: "Answers 24×7", values: [true, false, false, false] },
  { label: "Speaks Hindi + English", values: [true, true, null, false] },
  { label: "Your customer data", values: ["Yours", "Yours", "—", "Theirs"] },
  { label: "Setup time", values: ["10 minutes", "1 month+", "—", "2 weeks"] },
];

function ComparisonTable() {
  const headers = ["AssistMint", "Full-time staff", "Missed messages", "Aggregator apps"];
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card shadow-sm">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="sticky left-0 z-10 bg-card px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              &nbsp;
            </th>
            {headers.map((h, i) => (
              <th
                key={h}
                className={cn(
                  "px-5 py-3.5 text-xs font-bold",
                  i === 0 ? "bg-secondary/60 text-foreground" : "font-medium text-muted-foreground"
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON.map((row) => (
            <tr key={row.label} className="border-b border-border last:border-0">
              <th
                scope="row"
                className="sticky left-0 z-10 bg-card px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground"
              >
                {row.label}
              </th>
              {row.values.map((v, i) => (
                <td
                  key={i}
                  className={cn(
                    "px-5 py-3.5",
                    i === 0 && "bg-secondary/60 font-semibold tabular-nums text-foreground"
                  )}
                >
                  {v === true ? (
                    <Check className="h-4 w-4 text-primary" strokeWidth={2.5} aria-label="Yes" />
                  ) : v === false ? (
                    <X className="h-4 w-4 text-muted-foreground/50" strokeWidth={2.5} aria-label="No" />
                  ) : (
                    <span className={cn(i === 0 ? "tabular-nums" : "text-muted-foreground")}>{v}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <Eyebrow index="06">Pricing</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Priced like a helper, not a platform.
            </h2>
            <p className="mt-4 font-heading text-2xl font-semibold tabular-nums text-primary sm:text-3xl">
              From ₹17 a day.
            </p>
          </div>
        </SectionReveal>

        {/* Interactive island — toggle + plan cards */}
        <SectionReveal delay={0.05}>
          <PricingPlans />
        </SectionReveal>

        {/* Alternatives comparison — what a shop actually pays otherwise */}
        <SectionReveal delay={0.05}>
          <div className="mt-16">
            <ComparisonTable />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              WhatsApp conversation fees (Meta) billed at actuals — shown before you send.
            </p>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
