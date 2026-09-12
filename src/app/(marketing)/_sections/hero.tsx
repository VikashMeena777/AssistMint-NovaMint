import Link from "next/link";
import { ArrowDown, ArrowRight, Check } from "lucide-react";
import { FadeIn } from "@/components/motion/kit";
import { Marquee } from "@/components/marketing/animated-primitives";
import { ChatThreadLazy } from "@/components/marketing/chat-thread-lazy";
import { WordSwap } from "@/components/marketing/word-swap";

// ═══════════════════════════════════════════════
// 1 — HERO (id=demo): editorial copy + live thread card + order-line marquee
//     Server component — the thread card is a lazy client island.
// ═══════════════════════════════════════════════

/** P9 — realistic anonymized order lines; the content is the design. */
const ORDER_LINES = [
  "Rohit · 2× Paneer Tikka Roll · ₹448 · UPI paid",
  "Dr. Mehta's Clinic · 3 appointments booked",
  "Lakshmi Salon · Sunday 11 am slot · confirmed",
  "Cafe Kokum · daily special · 412 delivered",
  "Arjun · combo meal · ₹999 UPI · loyalty +10 pts",
  "Priya's Dhaba · table for 4 · 9:15 pm · booked",
  "Kumar Stores · blue kurta (L) · reserved till 8 pm",
  "Sharma Sweets · Diwali hamper enquiry · follow-up sent",
  "Verma Classes · physics demo · Saturday 5 pm · seat held",
  "CoolPoint AC · service visit ₹449 · tomorrow 11 am",
];

export function HeroSection() {
  return (
    // .paper — the faint dotted grain on the hero band
    <section className="paper">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-36 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* LEFT — copy */}
          <div className="text-center lg:text-left">
            <FadeIn direction="up">
              <span className="inline-block rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-primary">
                THE AI FRONT DESK — ON YOUR OFFICIAL WHATSAPP
              </span>
            </FadeIn>

            <FadeIn direction="up" delay={0.08}>
              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                The AI front desk for your business on WhatsApp.{" "}
                <span className="mt-1 block">
                  It takes your <WordSwap />.
                </span>
              </h1>
            </FadeIn>

            <FadeIn direction="up" delay={0.16}>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
                Replies to every customer in seconds — 24×7 — on the number they
                already message. Live in 10 minutes.
              </p>
            </FadeIn>

            <FadeIn direction="up" delay={0.24}>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
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
            </FadeIn>

            <FadeIn direction="up" delay={0.32}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground lg:justify-start">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                  No new app for your customers.
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
                  No number to change.
                </span>
              </div>
            </FadeIn>
          </div>

          {/* RIGHT — the live thread card (no bezel, no notch), floating on a
              paper-stack offset shadow card (transform only) */}
          <div id="demo" className="flex scroll-mt-24 justify-center">
            <FadeIn direction="up" delay={0.2} className="w-full">
              <div className="relative mx-auto w-full max-w-md">
                <div
                  aria-hidden
                  className="absolute inset-0 translate-x-2 translate-y-2 rounded-2xl border bg-secondary"
                />
                <ChatThreadLazy />
              </div>
            </FadeIn>
          </div>
        </div>
      </div>

      {/* Order-line marquee — full-bleed strip, hairline rules, 48s, hover-pause.
          LIVE label + pulsing seal dot above, mono ledger style. */}
      <div
        className="rule-y py-4"
        aria-label="Sample order lines from businesses using AssistMint"
      >
        <p className="mb-2.5 flex items-center justify-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span aria-hidden className="relative inline-flex size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-seal/70 motion-reduce:animate-none" />
            <span className="relative inline-flex size-1.5 rounded-full bg-seal" />
          </span>
          Live from businesses like yours
        </p>
        <Marquee>
          {ORDER_LINES.map((line) => (
            <span
              key={line}
              className="inline-flex items-center gap-2 font-mono text-[13px] text-muted-foreground"
            >
              <span aria-hidden className="size-1 rounded-full bg-seal/70" />
              {line}
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  );
}
