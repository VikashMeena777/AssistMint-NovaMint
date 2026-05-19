"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  ShoppingCart,
  CreditCard,
  BarChart3,
  Bot,
  Globe,
  Shield,
  Zap,
  ChevronRight,
  Star,
  Check,
  ArrowRight,
  Smartphone,
  Clock,
  Users,
  TrendingUp,
  Sparkles,
  ChevronDown,
  Play,
  HeadphonesIcon,
} from "lucide-react";
import {
  AnimatedCounter,
  SectionReveal,
  StaggerContainer,
  StaggerItem,
} from "@/components/marketing/animated-primitives";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <LogosSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
    </>
  );
}

// ═══════════════════════════════════════════════
// HERO — Clean White Background
// ═══════════════════════════════════════════════

function HeroSection() {
  return (
    <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 overflow-hidden">
      {/* Subtle background gradient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-primary/5 via-primary/3 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm"
          >
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            Now available for Indian restaurants
            <ChevronRight className="h-3.5 w-3.5" />
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl leading-[1.1]"
          >
            Your Restaurant on{" "}
            <span className="text-primary">WhatsApp</span>,{" "}
            Powered by AI
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            Automate ordering, payments, and customer engagement with an
            intelligent WhatsApp chatbot. Your customers order 24/7 — you grow
            without lifting a finger.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all gap-2 group"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-6 text-sm font-semibold hover:bg-secondary transition-colors gap-2"
            >
              <Play className="h-4 w-4 text-primary" />
              See How It Works
            </a>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
              <span className="ml-1.5 font-medium">4.9/5</span>
            </div>
            <span className="hidden sm:inline text-border">•</span>
            <span>Trusted by <strong className="text-foreground font-semibold">500+</strong> restaurants</span>
            <span className="hidden sm:inline text-border">•</span>
            <span>No credit card required</span>
          </motion.div>
        </div>

        {/* Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <div className="rounded-xl border border-border bg-card p-1 shadow-2xl shadow-black/5">
            <div className="rounded-lg bg-secondary/40 overflow-hidden">
              <div className="p-6">
                {/* Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Today's Orders", value: "47", icon: ShoppingCart, trend: "+12%" },
                    { label: "Revenue", value: "₹18,450", icon: CreditCard, trend: "+28%" },
                    { label: "Active Chats", value: "12", icon: MessageSquare, trend: "Live" },
                    { label: "Customers", value: "324", icon: Users, trend: "+8%" },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + i * 0.08 }}
                      className="rounded-lg bg-card border border-border p-4"
                    >
                      <div className="flex items-center justify-between">
                        <stat.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {stat.trend}
                        </span>
                      </div>
                      <p className="mt-2 text-xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Chat Preview */}
                <div className="mt-4 rounded-lg bg-card border border-border overflow-hidden">
                  {/* WhatsApp-style header */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#075e54]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white text-xs font-bold">
                      🤖
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">AssistMint Bot</p>
                      <p className="text-[10px] text-white/70">online</p>
                    </div>
                    <div className="ml-auto flex h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
                  </div>
                  {/* Chat bubbles */}
                  <div className="p-4 space-y-2.5 bg-[#ece5dd]/30">
                    {[
                      { msg: "Hi! Can I see your menu? 🍕", from: "user" },
                      { msg: "Welcome! 🌿 Here's our menu. What would you like to order today?", from: "bot" },
                      { msg: "1 Paneer Butter Masala + 2 Butter Naan", from: "user" },
                      { msg: "Great choice! ✅ Total: ₹350. Here's your payment link.", from: "bot" },
                    ].map((chat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: chat.from === "user" ? 12 : -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.0 + i * 0.3 }}
                        className={`flex ${chat.from === "user" ? "justify-end" : ""}`}
                      >
                        <div
                          className={`rounded-xl px-3.5 py-2 text-sm max-w-[75%] shadow-sm ${
                            chat.from === "user"
                              ? "rounded-tr-sm bg-[#dcf8c6] text-foreground"
                              : "rounded-tl-sm bg-white text-foreground"
                          }`}
                        >
                          {chat.msg}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// LOGOS — Trusted By (no tech stack)
// ═══════════════════════════════════════════════

function LogosSection() {
  return (
    <section className="py-12 border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-medium tracking-widest text-muted-foreground uppercase mb-8">
          Trusted by restaurants across India
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {[
            "Spice Garden", "The Food Studio", "Biryani House",
            "Tandoor Express", "Chai & More", "Curry Nation",
          ].map((name) => (
            <span key={name} className="text-sm font-semibold text-muted-foreground/40">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════

function StatsSection() {
  const stats = [
    { value: 500, suffix: "+", label: "Restaurants", icon: Users },
    { value: 50000, suffix: "+", label: "Orders Processed", icon: ShoppingCart },
    { value: 99, suffix: ".9%", label: "Uptime SLA", icon: Shield },
    { value: 40, suffix: "%", label: "Revenue Boost", icon: TrendingUp },
  ];

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <StaggerContainer className="grid grid-cols-2 gap-4 lg:grid-cols-4" staggerDelay={0.08}>
          {stats.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="group text-center p-6 rounded-xl border border-border bg-card hover:shadow-md hover:border-primary/20 transition-all duration-300">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                  <stat.icon className="h-5 w-5" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-foreground">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// FEATURES
// ═══════════════════════════════════════════════

function FeaturesSection() {
  const features = [
    {
      icon: Bot,
      title: "AI Chatbot Engine",
      description: "Understands natural language, handles multilingual orders, and remembers customer preferences.",
    },
    {
      icon: ShoppingCart,
      title: "Smart Ordering",
      description: "Menu browsing, cart management, variants, add-ons, and combos — all inside WhatsApp.",
    },
    {
      icon: CreditCard,
      title: "Auto Payments",
      description: "UPI QR codes and payment links with instant confirmation via Cashfree.",
    },
    {
      icon: Globe,
      title: "8+ Languages",
      description: "Customers order in Hindi, Tamil, Telugu, or any Indian language they prefer.",
    },
    {
      icon: BarChart3,
      title: "Live Analytics",
      description: "Real-time orders, revenue trends, top items, and customer insights at a glance.",
    },
    {
      icon: Shield,
      title: "GST Compliant",
      description: "Automatic invoicing with CGST/SGST breakdown and digital receipts.",
    },
    {
      icon: Smartphone,
      title: "Campaigns",
      description: "Send targeted promotions and offers directly to customers via WhatsApp.",
    },
    {
      icon: Clock,
      title: "Scheduled Orders",
      description: "Customers schedule orders in advance for dine-in, delivery, or pickup.",
    },
    {
      icon: HeadphonesIcon,
      title: "Human Handoff",
      description: "AI seamlessly transfers to a human agent when it can't handle a query.",
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-28 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-primary mb-3">Features</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your restaurant needs
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              From AI-powered conversations to automated payments — we handle
              the tech so you can focus on the food.
            </p>
          </div>
        </SectionReveal>

        <StaggerContainer
          className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.06}
        >
          {features.map((f) => (
            <StaggerItem key={f.title}>
              <div className="group h-full rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-md hover:border-primary/20">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// HOW IT WORKS
// ═══════════════════════════════════════════════

function HowItWorksSection() {
  const steps = [
    { step: "1", title: "Sign Up & Add Your Menu", description: "Create your account, fill in restaurant details, and upload your menu in under 10 minutes." },
    { step: "2", title: "Connect WhatsApp", description: "Link your WhatsApp Business number. We handle the API setup — no coding required." },
    { step: "3", title: "Go Live with AI", description: "Your chatbot starts greeting customers, taking orders, and collecting payments — 24/7, automatically." },
    { step: "4", title: "Grow on Autopilot", description: "Track analytics, send campaigns, manage loyalty programs, and watch revenue grow." },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-primary mb-3">How It Works</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Up and running in minutes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              No coding, no hassle. Just connect and let AI handle the rest.
            </p>
          </div>
        </SectionReveal>

        <div className="mx-auto mt-14 max-w-3xl">
          <StaggerContainer className="space-y-4" staggerDelay={0.1}>
            {steps.map((step, i) => (
              <StaggerItem key={step.step}>
                <div className="flex gap-5 rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/20 transition-all duration-300">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// PRICING
// ═══════════════════════════════════════════════

function PricingSection() {
  const plans = [
    {
      name: "Starter",
      price: "₹999",
      period: "/mo",
      description: "Perfect for small restaurants getting started.",
      features: [
        "1,000 AI conversations/mo",
        "Full menu management",
        "Order management",
        "Basic analytics",
        "2 languages",
        "200 menu items",
        "3 staff accounts",
      ],
      cta: "Start Free Trial",
      popular: false,
    },
    {
      name: "Growth",
      price: "₹2,499",
      period: "/mo",
      description: "Full automation suite for growing restaurants.",
      features: [
        "Unlimited conversations",
        "Everything in Starter",
        "Payment collection",
        "WhatsApp campaigns",
        "Loyalty & rewards",
        "Combo deals",
        "7 languages",
        "10 staff accounts",
        "Priority support",
      ],
      cta: "Start Free Trial",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "₹4,999",
      period: "/mo",
      description: "For chains and high-volume operations.",
      features: [
        "Everything in Growth",
        "Multi-branch support",
        "Staff roles & permissions",
        "Kitchen display system",
        "API access",
        "White-label branding",
        "10+ languages",
        "Unlimited staff",
        "Dedicated account manager",
      ],
      cta: "Contact Sales",
      popular: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-primary mb-3">Pricing</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free for 14 days. No credit card required.
            </p>
          </div>
        </SectionReveal>

        <StaggerContainer className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-3" staggerDelay={0.1}>
          {plans.map((plan) => (
            <StaggerItem key={plan.name}>
              <div className={`relative rounded-xl border p-7 h-full transition-all duration-300 ${
                plan.popular
                  ? "border-primary bg-card shadow-lg shadow-primary/5 scale-[1.02]"
                  : "border-border bg-card hover:shadow-md hover:border-primary/20"
              }`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                    <Star className="h-3 w-3 fill-current" />
                    Most Popular
                  </div>
                )}

                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>

                <Link
                  href="/signup"
                  className={`mt-6 flex h-11 w-full items-center justify-center rounded-lg text-sm font-semibold transition-all group ${
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                      : "border border-border hover:bg-secondary"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="h-4 w-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// TESTIMONIALS
// ═══════════════════════════════════════════════

function TestimonialsSection() {
  const testimonials = [
    {
      name: "Rajesh Kumar",
      role: "Owner, Spice Garden",
      city: "Jaipur",
      text: "Our orders increased 40% in the first month. The AI handles Hindi perfectly — our customers love it!",
      rating: 5,
    },
    {
      name: "Priya Sharma",
      role: "Manager, The Food Studio",
      city: "Mumbai",
      text: "No more missed calls during rush hours. AssistMint handles 200+ orders daily without breaking a sweat.",
      rating: 5,
    },
    {
      name: "Arjun Reddy",
      role: "Owner, Biryani House",
      city: "Hyderabad",
      text: "The payment integration is seamless. Customers pay via UPI QR before we even start cooking!",
      rating: 5,
    },
  ];

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto max-w-2xl text-center mb-14">
            <p className="text-sm font-semibold text-primary mb-3">Testimonials</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Loved by restaurant owners
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              See why hundreds of restaurants trust AssistMint.
            </p>
          </div>
        </SectionReveal>

        <StaggerContainer className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-3" staggerDelay={0.1}>
          {testimonials.map((t) => (
            <StaggerItem key={t.name}>
              <div className="rounded-xl border border-border bg-card p-6 h-full hover:shadow-md hover:border-primary/20 transition-all duration-300">
                <div className="flex items-center gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.role} • {t.city}
                    </p>
                  </div>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// FAQ
// ═══════════════════════════════════════════════

function FAQSection() {
  const faqs = [
    {
      q: "How long does it take to set up?",
      a: "Under 10 minutes. Sign up, add your menu, connect your WhatsApp Business number, and your AI chatbot goes live immediately.",
    },
    {
      q: "Do I need a WhatsApp Business API account?",
      a: "Yes, you need a Meta WhatsApp Business API account. We guide you through the setup process step by step, or our team can handle it for you.",
    },
    {
      q: "What languages does the AI support?",
      a: "The AI supports 8+ Indian languages including Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, and English.",
    },
    {
      q: "How does payment collection work?",
      a: "We generate UPI QR codes and payment links automatically. When a customer places an order, the AI sends a payment link directly in WhatsApp.",
    },
    {
      q: "Is there a free trial?",
      a: "Yes! Every plan comes with a 14-day free trial. No credit card required.",
    },
    {
      q: "Can I customize the AI responses?",
      a: "Absolutely. You can set your restaurant's tone, greeting messages, menu descriptions, and special instructions.",
    },
    {
      q: "What happens if the AI can't handle a query?",
      a: "The AI seamlessly hands off to a human agent. You get a notification and the conversation transfers to your dashboard.",
    },
    {
      q: "Do you charge per order or per message?",
      a: "No per-order or per-message charges. You pay a flat monthly fee based on your plan.",
    },
  ];

  return (
    <section id="faq" className="py-20 sm:py-28 bg-secondary/30">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary mb-3">FAQ</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to know about AssistMint.
            </p>
          </div>
        </SectionReveal>

        <StaggerContainer className="space-y-2" staggerDelay={0.04}>
          {faqs.map((faq) => (
            <StaggerItem key={faq.q}>
              <FAQItem question={faq.q} answer={faq.a} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-left hover:bg-secondary/30 transition-colors"
      >
        <span className="text-sm font-semibold pr-4">{question}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════
// CTA
// ═══════════════════════════════════════════════

function CTASection() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="rounded-2xl bg-primary px-8 py-16 sm:px-16 sm:py-20 text-center">
            <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
              Ready to transform your restaurant?
            </h2>
            <p className="mt-4 text-base text-primary-foreground/80 max-w-xl mx-auto">
              Join 500+ restaurants already using AssistMint. Start your free
              trial today — no credit card required.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-white text-primary px-6 text-sm font-semibold shadow-md hover:bg-white/90 transition-all gap-2 group"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Talk to Sales
              </Link>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
