import { Check } from "lucide-react";

// ═══════════════════════════════════════════════
// 2 — TRUST STRIP: three quiet chips (server component)
// ═══════════════════════════════════════════════

export function TrustStrip() {
  const chips = [
    "Built on the official WhatsApp Business API",
    "Live in 10 minutes",
    "Zero commission — your regulars stay yours",
  ];
  return (
    <section className="py-10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 px-4 sm:px-6 lg:px-8">
        {chips.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-muted-foreground"
          >
            <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
            {chip}
          </span>
        ))}
      </div>
    </section>
  );
}
