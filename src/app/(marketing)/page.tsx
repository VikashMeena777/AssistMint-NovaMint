"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowRight, Check, ChevronDown, X } from "lucide-react";

// Ready-made motion kit pieces + the Bahikhata spring vocabulary
import { FadeIn } from "@/components/motion/kit";
import { spring } from "@/components/motion/tokens";

// Marketing primitives + the hero thread card
import {
  Marquee,
  SectionReveal,
  StaggerContainer,
  StaggerItem as CardStaggerItem,
} from "@/components/marketing/animated-primitives";
import { ChatThreadDemo } from "@/components/marketing/chat-thread-demo";

import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════
// Shared bits
// ═══════════════════════════════════════════════

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
      {children}
    </span>
  );
}

/** Elevation-only card hover (P7): content lifts 2px, two pre-rendered
 *  shadow layers crossfade by opacity. No tint, no glow, no box-shadow tween. */
function ElevateCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`group relative rounded-2xl transition-transform duration-150 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-100 shadow-md transition-opacity duration-200 group-hover:opacity-0 motion-reduce:transition-none"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100 motion-reduce:transition-none"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

export default function HomePage() {
  // Initial hash navigation (e.g. arriving from /about → /#pricing)
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  return (
    <div className="bg-background">
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

// ═══════════════════════════════════════════════
// 1 — HERO (id=demo): editorial copy + live thread card + order-line marquee
// ═══════════════════════════════════════════════

const WORDS = ["orders", "bookings", "payments", "regulars"];

/** P3 kinetic word-swap — popLayout, never a masked reveal. */
function WordSwap() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % WORDS.length), 2400);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="relative inline-grid overflow-visible align-baseline">
      {/* invisible widest word reserves width — no reflow jitter */}
      <span aria-hidden className="invisible col-start-1 row-start-1">
        payments
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={WORDS[i]}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={spring.entrance}
          className="col-start-1 row-start-1 text-primary"
        >
          {WORDS[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

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

function HeroSection() {
  return (
    <section>
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

          {/* RIGHT — the live thread card (no bezel, no notch) */}
          <div id="demo" className="flex scroll-mt-24 justify-center">
            <FadeIn direction="up" delay={0.2} className="w-full">
              <ChatThreadDemo className="mx-auto" />
            </FadeIn>
          </div>
        </div>
      </div>

      {/* Order-line marquee — full-bleed strip, hairline rules, 48s, hover-pause */}
      <div className="rule-y py-4" aria-label="Sample order lines from businesses using AssistMint">
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

// ═══════════════════════════════════════════════
// 2 — TRUST STRIP: three quiet chips
// ═══════════════════════════════════════════════

function TrustStrip() {
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

// ═══════════════════════════════════════════════
// 3 — ONE TUESDAY, TWO SHOPS (before/after)
// ═══════════════════════════════════════════════

function TwoShopsSection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <Eyebrow>The problem</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              One Tuesday. Two shops.
            </h2>
          </div>
        </SectionReveal>

        <div className="grid gap-5 md:grid-cols-2">
          {/* WITHOUT MINT — muted */}
          <CardStaggerItem>
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
          </CardStaggerItem>

          {/* WITH MINT — cobalt */}
          <CardStaggerItem>
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

// ═══════════════════════════════════════════════
// 4 — HOW IT WORKS: 3 steps, mono badges
// ═══════════════════════════════════════════════

const STEPS = [
  { n: "01", text: "Share your menu or services" },
  { n: "02", text: "Mint learns your prices, timings, delivery areas" },
  { n: "03", text: "It answers 24×7 — you check the morning report" },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-y border-border bg-secondary/30 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <Eyebrow>Setup</Eyebrow>
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

// ═══════════════════════════════════════════════
// 5 — VERTICAL SWITCHER (P4 layoutId pill) — replaces the bento
// ═══════════════════════════════════════════════

const VERTICALS = [
  {
    id: "restaurant",
    tab: "Restaurant",
    line: "Orders and table bookings taken mid-rush — in English or Hinglish.",
    q: "Table for 4 at 9?",
    a: "Booked ✓ 9:00 pm, table for 4. See you tonight!",
  },
  {
    id: "salon",
    tab: "Salon",
    line: "Slots offered, confirmed and rescheduled — without a single phone call.",
    q: "Sunday slot for haircut?",
    a: "Confirmed — Sunday 11:00 am with Ravi. Reply R to reschedule.",
  },
  {
    id: "clinic",
    tab: "Clinic",
    line: "Tokens, timings and doctor availability — answered without disturbing the front desk.",
    q: "Dr. Mehta available tomorrow?",
    a: "Yes — token 14, 10:20 am. Shall I book it?",
  },
  {
    id: "coaching",
    tab: "Coaching",
    line: "Demo-class enquiries booked and reminded, so batches fill themselves.",
    q: "Physics demo class?",
    a: "Saturday 5–6 pm, free demo. Seat reserved ✓",
  },
  {
    id: "retail",
    tab: "Retail",
    line: "Stock questions answered in seconds; items held till the customer walks in.",
    q: "Do you have this in blue?",
    a: "Yes — M and L in blue. Reserved till 8 pm under your name.",
  },
  {
    id: "services",
    tab: "Services",
    line: "Quotes sent, visits scheduled and follow-ups chased — on WhatsApp.",
    q: "AC repair quote?",
    a: "Visit + check ₹449. Tomorrow 11 am slot open — book?",
  },
];

function MiniChat({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-2 text-[13px] leading-snug">
        <p className="wa-bubble-out max-w-[85%] self-end rounded-2xl rounded-tr-sm px-3.5 py-2 shadow-sm">
          {q}
        </p>
        <p className="max-w-[85%] self-start rounded-2xl rounded-tl-sm border bg-secondary/60 px-3.5 py-2 text-card-foreground shadow-sm">
          {a}
        </p>
      </div>
    </div>
  );
}

function VerticalSwitcherSection() {
  const [active, setActive] = useState(VERTICALS[0].id);
  const current = VERTICALS.find((v) => v.id === active) ?? VERTICALS[0];

  return (
    <section id="features" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <Eyebrow>Features</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Speaks your shop&apos;s language.
            </h2>
          </div>
        </SectionReveal>

        {/* P4 — the active pill is ONE element that slides between tabs */}
        <SectionReveal delay={0.05}>
          <div
            role="tablist"
            aria-label="Business type"
            className="mx-auto mb-10 flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border bg-card p-1 shadow-sm"
          >
            {VERTICALS.map((v) => {
              const on = v.id === active;
              return (
                <button
                  key={v.id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActive(v.id)}
                  className={`relative shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm transition-colors ${
                    on ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {on && (
                    <motion.span
                      layoutId="vertical-pill"
                      transition={spring.snappy}
                      className="absolute inset-0 rounded-full bg-foreground/[0.07]"
                    />
                  )}
                  <span className={`relative ${on ? "font-medium" : ""}`}>{v.tab}</span>
                </button>
              );
            })}
          </div>
        </SectionReveal>

        {/* One panel per vertical — crossfade + small rise */}
        <div className="mx-auto max-w-4xl">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
              transition={spring.entrance}
              className="grid items-center gap-8 md:grid-cols-2"
            >
              <div>
                <h3 className="text-xl font-semibold leading-snug tracking-tight text-foreground">
                  {current.tab}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {current.line}
                </p>
              </div>
              <MiniChat q={current.q} a={current.a} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// 6 — REAL CONVERSATIONS GALLERY (masked transcripts)
// ═══════════════════════════════════════════════

const CHATS = [
  {
    tag: "Restaurant",
    time: "11:04 PM · TUE",
    lines: [
      { mint: false, sender: "•• 207", text: "Bhai late night option hai kya?" },
      { mint: true, sender: "Mint", text: "Haan ji! Kitchen is open till 12. Reply “1” to see the menu and order." },
      { mint: false, sender: "•• 207", text: "1 butter chicken + 4 rumali" },
      { mint: true, sender: "Mint", text: "Order #1214 · ₹529 · UPI link sent ✓" },
    ],
  },
  {
    tag: "Salon",
    time: "9:12 AM · SUN",
    lines: [
      { mint: false, sender: "•• 883", text: "Sunday koi slot hai haircut ka?" },
      { mint: true, sender: "Mint", text: "11:00 am and 4:30 pm are open. Which one?" },
      { mint: false, sender: "•• 883", text: "11 waala" },
      { mint: true, sender: "Mint", text: "Booked ✓ Sunday 11:00 am with Ravi. Reminder goes out Saturday." },
    ],
  },
  {
    tag: "Clinic",
    time: "6:41 PM · WED",
    lines: [
      { mint: false, sender: "•• 551", text: "Dr. Mehta available tomorrow?" },
      { mint: true, sender: "Mint", text: "Yes — token 14 at 10:20 am. Shall I book it?" },
      { mint: false, sender: "•• 551", text: "yes please" },
      { mint: true, sender: "Mint", text: "Token 14 confirmed ✓ Visit ₹400 · report by 2 pm" },
    ],
  },
  {
    tag: "Home services",
    time: "1:23 PM · SAT",
    lines: [
      { mint: false, sender: "•• 190", text: "AC repair — visit charge kitna?" },
      { mint: true, sender: "Mint", text: "Visit + check ₹449 — free if you get the repair done. Tomorrow 11 am?" },
      { mint: false, sender: "•• 190", text: "book 11" },
      { mint: true, sender: "Mint", text: "Done ✓ Technician Rahul, 11:00–11:30 am" },
    ],
  },
];

function RealConversationsSection() {
  return (
    <section className="border-y border-border bg-secondary/30 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <Eyebrow>Proof</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Real chats. Numbers masked. Nothing staged.
            </h2>
          </div>
        </SectionReveal>

        <StaggerContainer className="grid gap-5 md:grid-cols-2" staggerDelay={0.07}>
          {CHATS.map((chat) => (
            <CardStaggerItem key={chat.tag}>
              <div className="h-full rounded-2xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <span className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground">
                    {chat.time}
                  </span>
                  <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {chat.tag}
                  </span>
                </div>
                <ul className="mt-4 space-y-3">
                  {chat.lines.map((line, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className={cn(
                          "w-14 shrink-0 pt-px font-mono text-[11px] font-semibold",
                          line.mint ? "text-primary" : "text-muted-foreground/70"
                        )}
                      >
                        {line.sender}
                      </span>
                      <span className="text-sm leading-relaxed text-foreground">{line.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardStaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// 7 — WHAT MINT WILL NEVER DO (trust contract)
// ═══════════════════════════════════════════════

const PROMISES = [
  { bad: true, text: "Never message your customers without you" },
  { bad: true, text: "Never share your data" },
  { bad: false, text: "Hands over to you the moment it's unsure" },
  { bad: false, text: "Cancel anytime — you keep your number" },
];

function NeverDoSection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mb-10 text-center">
            <Eyebrow>Our promises</Eyebrow>
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

// ═══════════════════════════════════════════════
// 8 — PRICING: real plans, springy toggle, ₹/day anchor,
//     alternatives comparison table
// ═══════════════════════════════════════════════

function BillingToggle({
  value,
  onChange,
}: {
  value: "monthly" | "yearly";
  onChange: (v: "monthly" | "yearly") => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="inline-flex rounded-full border bg-card p-1 shadow-sm">
        {(["monthly", "yearly"] as const).map((v) => {
          const on = value === v;
          return (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(v)}
              className={`relative rounded-full px-5 py-2 text-xs font-bold transition-colors ${
                on ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {on && (
                <motion.span
                  layoutId="billing-pill"
                  transition={spring.snappy}
                  className="absolute inset-0 rounded-full bg-foreground/[0.07]"
                />
              )}
              <span className="relative">{v === "monthly" ? "Monthly" : "Yearly"}</span>
            </button>
          );
        })}
      </div>
      {/* SAVE 17% badge pops when Yearly lands */}
      <AnimatePresence>
        {value === "yearly" && (
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.1 } }}
            transition={spring.snappy}
            className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary"
          >
            SAVE 17%
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

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
            <th className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground"
              >
                {row.label}
              </th>
              {row.values.map((v, i) => (
                <td
                  key={i}
                  className={cn(
                    "px-5 py-3.5",
                    i === 0 && "bg-secondary/60 font-semibold text-foreground"
                  )}
                >
                  {v === true ? (
                    <Check className="h-4 w-4 text-primary" strokeWidth={2.5} aria-label="Yes" />
                  ) : v === false ? (
                    <X className="h-4 w-4 text-muted-foreground/50" strokeWidth={2.5} aria-label="No" />
                  ) : (
                    <span className={i === 0 ? "" : "text-muted-foreground"}>{v}</span>
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

function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const plans = [
    {
      name: "Free",
      priceMonthly: 0,
      priceYearly: 0,
      description: "Get started with AI ordering at zero cost. Perfect to explore.",
      badge: null,
      features: [
        "50 orders/month",
        "20 menu items",
        "500 AI bot responses/month",
        "2 active coupons & combos",
        "Basic loyalty (points only)",
        "Online payments (Cashfree)",
        "1 custom AI persona",
        "2 languages (EN + HI)",
      ],
      cta: "Get Started Free",
      popular: false,
      trial: false,
    },
    {
      name: "Starter",
      priceMonthly: 499,
      priceYearly: Math.round(4999 / 12),
      description: "For growing restaurants ready to scale their WhatsApp orders.",
      badge: "14-DAY FREE TRIAL",
      features: [
        "300 orders/month",
        "75 menu items",
        "2,000 AI bot responses/month",
        "3 campaigns/month (100 contacts)",
        "10 active coupons & combos",
        "5 loyalty rewards",
        "2 team members",
        "30-day analytics",
      ],
      cta: "Start 14-Day Free Trial",
      popular: false,
      trial: true,
    },
    {
      name: "Growth",
      priceMonthly: 999,
      priceYearly: Math.round(9999 / 12),
      description: "Full-featured plan with campaigns, loyalty tiers & priority support.",
      badge: null,
      features: [
        "1,000 orders/month",
        "200 menu items",
        "10,000 AI bot responses/month",
        "15 campaigns/month (500 contacts)",
        "50 active coupons & combos",
        "Full loyalty (tiers + rewards)",
        "5 team members",
        "90-day analytics + email support",
      ],
      cta: "Get Started Now",
      popular: true,
      trial: false,
    },
    {
      name: "Enterprise",
      priceMonthly: 2499,
      priceYearly: Math.round(24999 / 12),
      description: "Unlimited everything for high-volume and multi-outlet chains.",
      badge: null,
      features: [
        "Unlimited orders & menu items",
        "Unlimited AI responses",
        "Unlimited campaigns & contacts",
        "Unlimited coupons, combos & rewards",
        "Full loyalty + custom tiers",
        "Multi-persona AI bots",
        "Unlimited team members",
        "Full history + WhatsApp support",
      ],
      cta: "Talk to Sales",
      popular: false,
      trial: false,
    },
  ];

  return (
    <section id="pricing" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Priced like a helper, not a platform.
            </h2>
            <p className="mt-4 font-heading text-2xl font-semibold text-primary sm:text-3xl">
              From ₹17 a day.
            </p>
          </div>
        </SectionReveal>

        <SectionReveal delay={0.05}>
          <div className="mb-14">
            <BillingToggle value={billingPeriod} onChange={setBillingPeriod} />
          </div>
        </SectionReveal>

        {/* Plan cards — hairline borders; Growth carries the cobalt border + seal */}
        <StaggerContainer
          className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-4"
          staggerDelay={0.06}
        >
          {plans.map((plan) => {
            const activePrice =
              billingPeriod === "monthly" ? plan.priceMonthly : plan.priceYearly;

            return (
              <CardStaggerItem key={plan.name} className="h-full">
                <ElevateCard className="h-full">
                  <div
                    className={cn(
                      "relative flex h-full flex-col rounded-2xl bg-card p-6",
                      plan.popular ? "border-2 border-primary" : "border border-border"
                    )}
                  >
                    {/* BEST VALUE seal — the one marigold stamp on the page */}
                    {plan.popular && (
                      <div className="absolute -top-3.5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-seal px-4 py-1 text-[10px] font-black uppercase tracking-widest text-seal-foreground shadow-sm">
                        BEST VALUE
                      </div>
                    )}

                    {/* Trial badge — Starter */}
                    {plan.trial && (
                      <div className="absolute -top-3.5 left-1/2 z-10 inline-flex -translate-x-1/2 rounded-full border border-border bg-card px-4 py-1 text-[10px] font-black uppercase tracking-widest text-foreground shadow-sm">
                        {plan.badge}
                      </div>
                    )}

                    <div className="flex h-full flex-col justify-between">
                      <div>
                        <h3 className="text-base font-bold tracking-tight text-foreground">
                          {plan.name}
                        </h3>
                        <div className="mt-3 flex items-baseline gap-1">
                          {plan.priceMonthly === 0 ? (
                            <span className="text-3xl font-bold tracking-tight text-foreground">
                              Free
                            </span>
                          ) : (
                            <>
                              <span className="text-3xl font-bold tracking-tight text-foreground">
                                ₹{activePrice.toLocaleString("en-IN")}
                              </span>
                              <span className="text-xs font-semibold text-muted-foreground">
                                /month
                              </span>
                            </>
                          )}
                        </div>
                        {plan.priceMonthly === 0 && (
                          <span className="mt-1.5 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            Free forever — no credit card needed
                          </span>
                        )}
                        {billingPeriod === "yearly" && plan.priceMonthly > 0 && (
                          <span className="mt-1.5 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            Billed annually · Save ₹
                            {(
                              plan.priceMonthly * 12 -
                              plan.priceYearly * 12
                            ).toLocaleString("en-IN")}
                            /yr
                          </span>
                        )}
                        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                          {plan.description}
                        </p>

                        <ul className="mt-5 space-y-2.5">
                          {plan.features.map((feature) => (
                            <li
                              key={feature}
                              className="flex items-start gap-2 text-xs text-muted-foreground"
                            >
                              <Check
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success"
                                strokeWidth={2.5}
                              />
                              <span className="leading-normal">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-6 border-t border-border pt-4">
                        <Link
                          href={
                            plan.name === "Enterprise"
                              ? "mailto:support@assistmint.in?subject=Enterprise Plan Inquiry"
                              : `/signup?plan=${plan.name.toLowerCase()}`
                          }
                          className={cn(
                            "group flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-transform duration-150 ease-out hover:-translate-y-px active:translate-y-0",
                            plan.popular
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : plan.trial
                                ? "border border-primary text-primary"
                                : "border border-border text-foreground hover:bg-secondary"
                          )}
                        >
                          {plan.cta}
                          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transform-none" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </ElevateCard>
              </CardStaggerItem>
            );
          })}
        </StaggerContainer>

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

// ═══════════════════════════════════════════════
// 9 — FOUNDER CARD
// ═══════════════════════════════════════════════

function FounderSection() {
  return (
    <section className="pb-20 sm:pb-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
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
        </SectionReveal>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// 10 — FINAL CTA (paper band)
// ═══════════════════════════════════════════════

function FinalCtaSection() {
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

// ═══════════════════════════════════════════════
// 11 — FAQ (accessible accordion, aria kept)
// ═══════════════════════════════════════════════

const FAQS = [
  {
    q: "How long does it take to fully set up?",
    a: "Under 10 minutes. You sign up, add your categories and menu items, connect your Meta WhatsApp Business API securely via our guided layout, and your AI assistant is instantly active.",
  },
  {
    q: "Do I need a WhatsApp Business API account?",
    a: "Yes, meta requirements mandate using the official WhatsApp Business API to run high-volume automated chatbots. Our AssistMint portal guides you through secure self-serve integration in minutes.",
  },
  {
    q: "What Indian languages does the AI support?",
    a: "The conversational bot currently processes queries and orders in 6 regional languages, including English, Hindi (हिन्दी), Tamil (தமிழ்), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), and Marathi (मराठी).",
  },
  {
    q: "How are payment transactions handled?",
    a: "AssistMint integrates directly with Cashfree Payments. When a customer orders, the AI serves a secure UPI/Card checkout link right inside the chat window, confirming payment in real-time.",
  },
  {
    q: "Is there a transaction or commission fee per order?",
    a: "No commission fees whatsoever! We charge a transparent, flat monthly/yearly subscription based on your plan features. All revenues go straight to your merchant bank account.",
  },
  {
    q: "What happens if the AI fails to parse a message?",
    a: "No problem. If the AI encounters a customer question it can't resolve, it triggers a seamless Human Handoff. The conversation appears in real-time on your dashboard, notifying your support staff.",
  },
];

function FAQSection() {
  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mb-12 text-center">
            <Eyebrow>Questions</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              Frequently asked questions.
            </h2>
          </div>
        </SectionReveal>

        <StaggerContainer className="space-y-3" staggerDelay={0.05}>
          {FAQS.map((faq) => (
            <CardStaggerItem key={faq.q}>
              <FAQAccordion question={faq.q} answer={faq.a} />
            </CardStaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

function FAQAccordion({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left"
      >
        <span className="text-sm font-semibold leading-snug text-foreground">
          {question}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="border-t border-border px-5 pb-5 pt-3 text-sm leading-relaxed text-muted-foreground">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
