"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { ArrowRight, Check, ChevronDown, Play, Sparkles, Star } from "lucide-react";

// Ready-made motion kit pieces
import { AnimatedCard, FadeIn, Stagger, StaggerItem } from "@/components/motion/kit";
import { SplitHeadline } from "@/components/motion/split-headline";
import { IconDrawCard } from "@/components/motion/icon-draw";

// Lucide-animated icons (draw on card hover)
import { BotIcon } from "@/components/icons/bot/bot";
import { IndianRupeeIcon } from "@/components/icons/indian-rupee/indian-rupee";
import { MenuIcon } from "@/components/icons/menu/menu";
import { LanguagesIcon } from "@/components/icons/languages/languages";
import { ChartLineIcon } from "@/components/icons/chart-line/chart-line";
import { ReceiptIcon } from "@/components/icons/receipt/receipt";

// Marketing primitives + hero centerpiece
import {
  Marquee,
  SectionReveal,
  StaggerContainer,
  StaggerItem as CardStaggerItem,
} from "@/components/marketing/animated-primitives";
import { AuroraBackground } from "@/components/marketing/aurora-background";
import { WhatsAppPhoneDemo } from "@/components/marketing/whatsapp-phone-demo";

import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════
// Shared bits
// ═══════════════════════════════════════════════

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-primary/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
      {children}
    </span>
  );
}

/**
 * ScrollSplitHeadline — mounts SplitHeadline only once the heading scrolls
 * into view, so the masked line-reveal actually plays for below-the-fold
 * sections (SplitHeadline animates on mount). Until then a plain <h2>
 * renders — identical text, so SSR/SEO content is preserved.
 */
function ScrollSplitHeadline({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref}>
      {inView ? (
        <SplitHeadline as="h2" text={text} className={className} />
      ) : (
        <h2 className={className}>{text}</h2>
      )}
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
    <div className="overflow-hidden bg-background">
      <HeroSection />
      <BusinessMarqueeSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
    </div>
  );
}

// ═══════════════════════════════════════════════
// HERO — ink canvas, drifting mint auroras, live phone demo
// ═══════════════════════════════════════════════

function HeroSection() {
  return (
    <section className="relative">
      <AuroraBackground>
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-36 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
            {/* LEFT — copy */}
            <div className="text-center lg:text-left">
              <FadeIn direction="up">
                <span className="inline-flex items-center gap-2.5 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  AI WHATSAPP ASSISTANT FOR LOCAL BUSINESS
                </span>
              </FadeIn>

              {/* Masked line-reveal H1 — two sentences, "WhatsApp" in mint gradient */}
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.04] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                <span className="block overflow-hidden">
                  <motion.span
                    className="-mb-[0.08em] block pb-[0.08em]"
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
                  >
                    Your business on <span className="text-gradient-accent">WhatsApp</span>.
                  </motion.span>
                </span>
                <span className="block overflow-hidden">
                  <motion.span
                    className="-mb-[0.08em] block pb-[0.08em]"
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.22 }}
                  >
                    On autopilot.
                  </motion.span>
                </span>
              </h1>

              <FadeIn direction="up" delay={0.28}>
                <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
                  Orders, bookings, payments and loyalty — one AI assistant runs it all
                  on WhatsApp, around the clock. Zero commission on every sale.
                </p>
              </FadeIn>

              <FadeIn direction="up" delay={0.38}>
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                  <Link
                    href="/signup?plan=starter"
                    className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 hover:bg-primary/95 active:scale-[0.98] sm:w-auto"
                  >
                    Start free trial
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <a
                    href="#how-it-works"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 text-sm font-semibold text-foreground transition-all duration-300 hover:border-border/80 hover:bg-secondary sm:w-auto"
                  >
                    <Play className="h-4 w-4 fill-primary text-primary" />
                    See how it works
                  </a>
                </div>
              </FadeIn>

              <FadeIn direction="up" delay={0.48}>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                  {["6 business types", "6 languages", "Cashfree", "Free tier"].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-border/70 bg-card/60 px-3 py-1 text-[11px] font-medium text-muted-foreground"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </FadeIn>
            </div>

            {/* RIGHT — the live WhatsApp demo (auto-playing order script) */}
            <div className="relative flex flex-col items-center">
              <WhatsAppPhoneDemo />
              <FadeIn direction="up" delay={0.9} className="mt-5">
                <span className="inline-flex flex-row items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  Automated · 0 human touches
                </span>
              </FadeIn>
            </div>
          </div>
        </div>
      </AuroraBackground>
    </section>
  );
}

// ═══════════════════════════════════════════════
// BUSINESS MARQUEE — who this is for
// ═══════════════════════════════════════════════

const BUSINESSES = [
  { emoji: "🍕", label: "Restaurants" },
  { emoji: "💇", label: "Salons & Spas" },
  { emoji: "🏥", label: "Clinics" },
  { emoji: "📚", label: "Coaching" },
  { emoji: "🛍️", label: "Retail" },
  { emoji: "🔧", label: "Home Services" },
];

function BusinessMarqueeSection() {
  return (
    <section className="border-y border-border/40 bg-secondary/20 py-12">
      <p className="mb-8 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        Built for every local business
      </p>
      <Marquee speed={28}>
        {/* gap == pr so the -50% loop lands exactly on the seam */}
        <div className="flex items-center gap-4 pr-4 sm:gap-6 sm:pr-6">
          {[...BUSINESSES, ...BUSINESSES].map((b, i) => (
            <span
              key={`${b.label}-${i}`}
              className="inline-flex items-center gap-2.5 rounded-full border border-border/70 bg-card px-5 py-2.5 text-sm font-medium text-foreground"
            >
              <span aria-hidden>{b.emoji}</span>
              {b.label}
            </span>
          ))}
        </div>
      </Marquee>
    </section>
  );
}

// ═══════════════════════════════════════════════
// FEATURES — bento grid with draw-on-hover icons
// ═══════════════════════════════════════════════

function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <Eyebrow>Features</Eyebrow>
            <ScrollSplitHeadline
              text="Everything your counter needs. On autopilot."
              className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl"
            />
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              One assistant that runs the front of your business — orders in, payments
              settled, receipts sent. You just watch the dashboard.
            </p>
          </div>
        </SectionReveal>

        <StaggerContainer
          className="mx-auto grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3"
          staggerDelay={0.07}
        >
          {/* (a) AI order-taking — 2 col */}
          <CardStaggerItem className="h-full md:col-span-2">
            <IconDrawCard
              icon={BotIcon}
              iconBoxClass="bg-primary/10 text-primary"
              className="group glow-card h-full rounded-2xl border border-border bg-card p-6 md:p-7"
            >
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                AI that takes the order
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Customers chat like they text a friend. The AI understands Hinglish,
                add-ons and modifications — and builds the order by itself.
              </p>
              <div className="mt-6 space-y-2.5 rounded-xl border border-border/60 bg-secondary/30 p-4">
                <div className="flex justify-end">
                  <p className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary/10 px-3.5 py-2 text-xs leading-snug text-foreground">
                    2 garlic naan + 1 paneer butter masala
                  </p>
                </div>
                <div className="flex justify-start">
                  <p className="max-w-[80%] rounded-2xl rounded-tl-sm border border-border/60 bg-card px-3.5 py-2 text-xs leading-snug text-foreground">
                    ✅ Cart updated — ₹448. Pay via UPI or cash on delivery?
                  </p>
                </div>
              </div>
            </IconDrawCard>
          </CardStaggerItem>

          {/* (b) Payments — 1 col */}
          <CardStaggerItem className="h-full">
            <IconDrawCard
              icon={IndianRupeeIcon}
              iconBoxClass="bg-primary/10 text-primary"
              className="group glow-card flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-6"
            >
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  Payments built in
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  UPI links served straight in the chat via Cashfree. Payment confirmed
                  in seconds — no follow-up calls, no pending CODs.
                </p>
              </div>
              <div className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-success/25 bg-success/10 px-4 py-2">
                <Check className="h-3.5 w-3.5 text-success" />
                <span className="text-xs font-bold text-success">₹448 PAID · UPI</span>
              </div>
            </IconDrawCard>
          </CardStaggerItem>

          {/* (c) Catalog — 1 col */}
          <CardStaggerItem className="h-full">
            <IconDrawCard
              icon={MenuIcon}
              iconBoxClass="bg-primary/10 text-primary"
              className="group glow-card flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-6"
            >
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  Smart digital catalog
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  A clean web menu opens right from WhatsApp — items, add-ons, prices
                  and photos. Update once, live everywhere.
                </p>
              </div>
              <div className="mt-6 space-y-1.5 rounded-xl border border-border/60 bg-secondary/30 p-2">
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2">
                  <span className="text-xs font-semibold text-foreground">
                    Paneer Butter Masala
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                    ₹249 · Add +
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2">
                  <span className="text-xs font-semibold text-foreground">Garlic Naan (2)</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                    ₹99 · Add +
                  </span>
                </div>
              </div>
            </IconDrawCard>
          </CardStaggerItem>

          {/* (d) Languages — 2 col */}
          <CardStaggerItem className="h-full md:col-span-2">
            <IconDrawCard
              icon={LanguagesIcon}
              iconBoxClass="bg-primary/10 text-primary"
              className="group glow-card h-full rounded-2xl border border-border bg-card p-6 md:p-7"
            >
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                6 Indian languages
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Customers order in their mother tongue — English, Hindi, Tamil, Telugu,
                Kannada or Marathi. The AI switches automatically.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["EN", "HI", "TA", "TE", "KN", "MR"].map((lang) => (
                  <span
                    key={lang}
                    className="rounded-lg border border-border/70 bg-secondary/40 px-3 py-1.5 font-mono text-[11px] font-bold tracking-wider text-muted-foreground"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </IconDrawCard>
          </CardStaggerItem>

          {/* (e) Analytics — 1 col */}
          <CardStaggerItem className="h-full">
            <IconDrawCard
              icon={ChartLineIcon}
              iconBoxClass="bg-primary/10 text-primary"
              className="group glow-card flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-6"
            >
              <div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  Live analytics
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Orders, revenue and repeat rate on one dashboard — updated the moment
                  a payment lands.
                </p>
              </div>
              <svg
                viewBox="0 0 160 40"
                className="mt-6 h-11 w-full"
                fill="none"
                aria-hidden="true"
              >
                <polyline
                  points="2,32 24,26 46,29 68,20 90,23 112,12 134,15 158,5"
                  stroke="var(--chart-1)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </IconDrawCard>
          </CardStaggerItem>

          {/* (f) Receipts — 2 col */}
          <CardStaggerItem className="h-full md:col-span-2">
            <IconDrawCard
              icon={ReceiptIcon}
              iconBoxClass="bg-primary/10 text-primary"
              className="group glow-card h-full rounded-2xl border border-border bg-card p-6 md:p-7"
            >
              <h3 className="text-lg font-bold tracking-tight text-foreground">
                GST-ready receipts
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Every paid order gets an itemized receipt with a CGST/SGST breakdown,
                generated and sent on WhatsApp automatically.
              </p>
              <div className="mt-6 flex w-fit items-center gap-3 rounded-lg border border-dashed border-border/70 bg-secondary/30 px-4 py-2.5">
                <span className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">
                  CM/2026-27/00001
                </span>
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-success">
                  Sent
                </span>
              </div>
            </IconDrawCard>
          </CardStaggerItem>
        </StaggerContainer>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// HOW IT WORKS — 4 steps, mono badges, connector line
// ═══════════════════════════════════════════════

const STEPS = [
  {
    step: "01",
    title: "Connect your WhatsApp",
    desc: "Link your official WhatsApp Business number through our guided Meta setup. No code, no consultants.",
  },
  {
    step: "02",
    title: "Set your catalog",
    desc: "Add items, services, prices and hours in minutes — your smart menu goes live with one tap.",
  },
  {
    step: "03",
    title: "AI goes live",
    desc: "Your assistant greets customers, answers questions and takes orders in 6 languages — instantly.",
  },
  {
    step: "04",
    title: "Watch orders roll in",
    desc: "UPI payments confirmed in chat, receipts sent automatically, every order tracked live on your dashboard.",
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-24 border-y border-border/30 bg-secondary/20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <Eyebrow>How it works</Eyebrow>
            <ScrollSplitHeadline
              text="Live on WhatsApp in four steps."
              className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl"
            />
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              No consultants, no code, no new hardware. If you can send a WhatsApp
              message, you can run this.
            </p>
          </div>
        </SectionReveal>

        <Stagger className="relative mx-auto max-w-6xl" amount={0.1}>
          {/* Gradient connector line (desktop) — badges cover it as it passes behind */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-[12%] right-[12%] top-7 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent lg:block"
          />

          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((item) => (
              <StaggerItem key={item.step}>
                <div className="group flex flex-col items-center text-center lg:items-start lg:text-left">
                  <div className="glow-card relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card font-mono text-lg font-bold text-primary">
                    {item.step}
                  </div>
                  <h3 className="mt-5 text-base font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </div>
        </Stagger>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// PRICING — same plans, same toggle, restyled cards
// ═══════════════════════════════════════════════

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
    <section id="pricing" className="scroll-mt-24 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <Eyebrow>Transparent pricing</Eyebrow>
            <ScrollSplitHeadline
              text="Flexible Plans to Scale Profits"
              className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl"
            />
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Try our Starter Plan completely free for 14 days. Save 17% on yearly
              billing. Zero commission commitments.
            </p>
          </div>
        </SectionReveal>

        {/* Monthly / Yearly toggle */}
        <div className="mb-16 flex items-center justify-center">
          <div className="relative flex rounded-full border border-border/80 bg-card p-1 shadow-inner">
            <button
              onClick={() => setBillingPeriod("monthly")}
              aria-pressed={billingPeriod === "monthly"}
              className={`relative z-10 cursor-pointer rounded-full px-5 py-2 text-xs font-bold transition-all duration-300 ${
                billingPeriod === "monthly"
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              aria-pressed={billingPeriod === "yearly"}
              className={`relative z-10 flex cursor-pointer items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold transition-all duration-300 ${
                billingPeriod === "yearly"
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly Billing
              <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">
                SAVE 17%
              </span>
            </button>

            {/* Sliding pill indicator */}
            <motion.div
              className="absolute bottom-1 left-1 z-0 rounded-full bg-primary"
              initial={false}
              animate={{
                left: billingPeriod === "monthly" ? "4px" : "124px",
                width: billingPeriod === "monthly" ? "116px" : "138px",
              }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          </div>
        </div>

        {/* Cards */}
        <StaggerContainer
          className="mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-4"
          staggerDelay={0.06}
        >
          {plans.map((plan) => {
            const activePrice = billingPeriod === "monthly" ? plan.priceMonthly : plan.priceYearly;

            return (
              <CardStaggerItem key={plan.name} className="h-full">
                <AnimatedCard
                  className={cn(
                    "glow-card relative h-full rounded-2xl border bg-card p-6",
                    plan.popular
                      ? "glow-card-strong border-primary/40 lg:scale-[1.02]"
                      : "border-border"
                  )}
                >
                  {/* BEST VALUE chip — Growth */}
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-4 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      BEST VALUE
                    </div>
                  )}

                  {/* Trial badge — Starter */}
                  {plan.trial && (
                    <div className="absolute -top-3.5 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-amber-500 px-4 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                      <Sparkles className="h-2.5 w-2.5" />
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
                          <span className="text-3xl font-extrabold tracking-tight text-foreground">
                            Free
                          </span>
                        ) : (
                          <>
                            <span className="text-3xl font-extrabold tracking-tight text-foreground">
                              ₹{activePrice.toLocaleString("en-IN")}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">/month</span>
                          </>
                        )}
                      </div>
                      {plan.priceMonthly === 0 && (
                        <span className="mt-1.5 inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                          Free forever — no credit card needed
                        </span>
                      )}
                      {billingPeriod === "yearly" && plan.priceMonthly > 0 && (
                        <span className="mt-1.5 inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                          Billed annually · Save ₹{((plan.priceMonthly * 12) - (plan.priceYearly * 12)).toLocaleString("en-IN")}/yr
                        </span>
                      )}
                      <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                        {plan.description}
                      </p>

                      <ul className="mt-5 space-y-2.5">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            <span className="leading-normal">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-6 border-t border-border/40 pt-4">
                      <Link
                        href={plan.name === "Enterprise" ? "mailto:support@assistmint.in?subject=Enterprise Plan Inquiry" : `/signup?plan=${plan.name.toLowerCase()}`}
                        className={`group flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all ${
                          plan.popular
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/10 hover:bg-primary/95"
                            : plan.trial
                              ? "bg-amber-500 text-white shadow-md shadow-amber-500/10 hover:bg-amber-600"
                              : "border border-border text-foreground hover:border-border/80 hover:bg-secondary"
                        }`}
                      >
                        {plan.cta}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </div>
                  </div>
                </AnimatedCard>
              </CardStaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// FAQ — accessible accordion (aria-expanded/controls preserved)
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
    <section id="faq" className="scroll-mt-24 border-y border-border/30 bg-secondary/20 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mb-14 text-center">
            <Eyebrow>Have questions?</Eyebrow>
            <ScrollSplitHeadline
              text="Frequently Asked Questions"
              className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl"
            />
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Everything you need to know about AssistMint.
            </p>
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
    <div className="glow-card overflow-hidden rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-center justify-between p-5 text-left transition-colors hover:bg-secondary/40"
      >
        <span className="pr-4 text-xs font-bold leading-snug text-foreground sm:text-sm">
          {question}
        </span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
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
            <div className="border-t border-border/20 px-5 pb-5 pt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════
// FINAL CTA — ink panel, email capture
// ═══════════════════════════════════════════════

function CTASection() {
  const [emailInput, setEmailInput] = useState("");

  const handleCTASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    window.location.href = `/signup?email=${encodeURIComponent(emailInput)}`;
  };

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          {/* The panel is always ink-dark, so its inner colors are fixed
              brand values that read correctly in both themes. */}
          <div className="relative overflow-hidden rounded-3xl border border-border">
            <div aria-hidden className="ink-canvas absolute inset-0" />
            <div aria-hidden className="ink-grid absolute inset-0" />

            <div className="relative z-10 mx-auto max-w-2xl px-6 py-16 text-center sm:px-16 sm:py-20">
              <span className="inline-block rounded-full border border-[#22e1c2]/30 bg-[#22e1c2]/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#22e1c2]">
                Get started in 10 minutes
              </span>

              <ScrollSplitHeadline
                text="Put your business on WhatsApp tonight."
                className="mt-6 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl"
              />

              <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
                Sign up, add your menu, connect WhatsApp — your AI assistant takes the
                first order while you sleep.
              </p>

              <form
                onSubmit={handleCTASubmit}
                className="mx-auto mt-8 flex max-w-md flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <input
                  type="email"
                  placeholder="Enter your business email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white backdrop-blur-sm transition-all duration-300 placeholder:text-white/40 focus:border-[#22e1c2] focus:outline-none focus:ring-1 focus:ring-[#22e1c2]"
                />
                <button
                  type="submit"
                  className="inline-flex h-12 w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#22e1c2] px-6 text-xs font-bold uppercase tracking-wider text-[#04110d] transition-all duration-300 hover:brightness-110 active:scale-95 sm:w-auto"
                >
                  Start free trial
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>

              <p className="mt-5 text-[11px] font-medium uppercase tracking-wider text-white/40">
                No credit card required · Cancel anytime
              </p>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
