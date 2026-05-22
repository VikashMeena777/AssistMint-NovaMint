"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
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
  HelpCircle,
  TrendingDown,
  Lock,
  ChevronUp,
} from "lucide-react";
import {
  AnimatedCounter,
  SectionReveal,
  StaggerContainer,
  StaggerItem,
  Marquee,
} from "@/components/marketing/animated-primitives";
import {
  AuroraBackground,
  FloatingParticles,
} from "@/components/marketing/aurora-background";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// Simulated Sales Data for Mock Dashboard
const salesData = [
  { day: "Mon", sales: 12000 },
  { day: "Tue", sales: 15000 },
  { day: "Wed", sales: 14000 },
  { day: "Thu", sales: 22000 },
  { day: "Fri", sales: 26000 },
  { day: "Sat", sales: 34000 },
  { day: "Sun", sales: 31000 },
];

export default function HomePage() {
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
      <LogosSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
    </div>
  );
}

// ═══════════════════════════════════════════════
// HERO — Aurora Mesh, Interactive Chat Simulator & Metrics
// ═══════════════════════════════════════════════

function HeroSection() {
  const [mounted, setMounted] = useState(false);
  const [chatStep, setChatStep] = useState(0);

  // Hydration safety for Recharts
  useEffect(() => {
    setMounted(true);
  }, []);

  // WhatsApp Order Chat steps
  const chatSteps = [
    { sender: "customer", text: "Hi! Can I order something? 🍕", time: "12:30 PM" },
    {
      sender: "bot",
      text: "Hey! 🌿 Welcome to Spice Garden. Here's our top sellers today:\n\n1. Paneer Butter Masala (₹240)\n2. Butter Naan (₹40)\n3. Veg Biryani (₹180)\n\nTap below to browse the full menu!",
      time: "12:30 PM",
      hasButton: true,
    },
    { sender: "customer", text: "1 Paneer Butter Masala + 2 Butter Naan", time: "12:31 PM" },
    {
      sender: "bot",
      text: "Got it! Adding to your cart... 🛒\n\n✅ *Cart Updated:*\n• 1x Paneer Butter Masala (₹240)\n• 2x Butter Naan (₹80)\n\n💰 *Total:* ₹320\n\nWould you like to confirm this order?",
      time: "12:31 PM",
      hasConfirm: true,
    },
    { sender: "customer", text: "Yes, delivery to Sector 62, Noida", time: "12:32 PM" },
    {
      sender: "bot",
      text: "Perfect! 📍 Delivery confirmed. Please complete your payment securely via Cashfree:\n\n🔗 pay.assistmint.in/inv_x91b2\n\nOnce paid, your order goes directly to our kitchen!",
      time: "12:32 PM",
      hasPayButton: true,
    },
    {
      sender: "system",
      text: "💳 Payment Confirmed! Your order #9021 is now Paid & Preparing. Expected delivery in ~35 minutes.",
      time: "12:33 PM",
      isSystem: true,
    },
  ];

  // Rotate Chat Simulator steps
  useEffect(() => {
    const timer = setInterval(() => {
      setChatStep((prev) => {
        if (prev === chatSteps.length - 1) {
          return 0; // Reset
        }
        return prev + 1;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [chatSteps.length]);

  return (
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden bg-background">
      <AuroraBackground>
        <FloatingParticles />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* Tag / Announcement Pill */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm shadow-primary/5 hover:bg-primary/10 hover:border-primary/30 transition-all duration-300 cursor-pointer"
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="tracking-wide">AI-POWERED WHATSAPP INTAKE</span>
              <ChevronRight className="h-3 w-3 text-primary/80" />
            </motion.div>

            {/* Premium Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.05] font-heading"
            >
              Your Restaurant on{" "}
              <span className="text-gradient-accent relative">
                WhatsApp
                <span className="absolute left-0 bottom-1 h-[6px] w-full bg-primary/10 rounded-full blur-[2px]" />
              </span>
              <br />
              Powered by <span className="font-extrabold">AI</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto font-sans"
            >
              Automate ordering, payment collections, and customer loyalty program campaigns
              using an intelligent, multilingual WhatsApp chatbot. Boost your revenue while
              saving on hefty aggregator commissions.
            </motion.p>

            {/* Premium CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/signup"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95 hover:shadow-primary/30 transition-all active:scale-[0.98] gap-2 group cursor-pointer"
              >
                Try Starter Plan Free
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-xl border border-border bg-card px-8 text-sm font-semibold hover:bg-secondary hover:border-border/80 transition-all duration-300 gap-2 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-primary text-primary" />
                See How It Works
              </a>
            </motion.div>

            {/* Proof Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground font-medium"
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-1 font-semibold text-foreground">4.9/5 Rating</span>
              </div>
              <span className="text-border/60 hidden sm:inline">•</span>
              <span>Trusted by <span className="text-foreground font-bold">500+ Restaurants</span></span>
              <span className="text-border/60 hidden sm:inline">•</span>
              <span>14-Day Starter Free Trial</span>
            </motion.div>
          </div>

          {/* Interactive Dual Mockup Panel */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-16 max-w-5xl"
          >
            <div className="rounded-2xl border border-border bg-card/60 p-2 shadow-2xl shadow-black/10 backdrop-blur-md">
              <div className="rounded-xl bg-secondary/30 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 min-h-[500px]">
                
                {/* LEFT SIDE: Live Sales & Customer Trends Dashboard (Recharts + Widgets) */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-4 p-4 rounded-xl bg-card border border-border/50 shadow-sm relative overflow-hidden">
                  {/* Subtle Grid Pattern inside widget */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
                  
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          LIVE DASHBOARD
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        ACTIVE ORDERING
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground font-medium">Today's Revenue</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-extrabold tracking-tight font-heading">
                        ₹32,840
                      </span>
                      <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
                        <TrendingUp className="h-3 w-3" />
                        +32.4%
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Recharts Chart */}
                  <div className="h-44 w-full mt-4 flex items-end">
                    {mounted ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={salesData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                          <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="rgb(16, 185, 129)" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="rgb(16, 185, 129)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Tooltip 
                            contentStyle={{ 
                              background: "rgba(255,255,255,0.9)", 
                              borderRadius: "8px", 
                              border: "1px solid #e4e4e7",
                              fontSize: "12px",
                              color: "#0f172a" 
                            }} 
                            labelFormatter={() => "Sales"}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="sales" 
                            stroke="#059669" 
                            strokeWidth={2.5}
                            fillOpacity={1} 
                            fill="url(#colorSales)" 
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full bg-secondary/50 rounded-lg animate-pulse" />
                    )}
                  </div>

                  {/* Live Order Queue Feed */}
                  <div className="mt-4 space-y-2 border-t border-border/40 pt-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Recent Auto-Accepted Orders
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { id: "#9021", items: "1x Paneer Tikka, 2x Naan", amount: "₹320", status: "Preparing", time: "Just now" },
                        { id: "#9020", items: "2x Butter Chicken, 3x Roti", amount: "₹640", status: "Out for Delivery", time: "5 min ago" },
                      ].map((ord, idx) => (
                        <div key={ord.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/50 border border-border/30">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground">{ord.id}</span>
                              <span className="text-[9px] font-semibold bg-emerald-500/10 text-emerald-600 px-1 rounded">
                                {ord.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[160px]">{ord.items}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-foreground">{ord.amount}</span>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{ord.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE: Real-Time WhatsApp Chat Simulator */}
                <div className="lg:col-span-7 flex flex-col rounded-xl bg-card border border-border/50 shadow-sm overflow-hidden relative">
                  
                  {/* WhatsApp-style Header Bar */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#075e54] text-white shadow-md relative z-10">
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold shadow-inner">
                      🤖
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 border border-emerald-600 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-bold tracking-wide">AssistMint AI Engine</p>
                        <Sparkles className="h-3 w-3 text-emerald-300" />
                      </div>
                      <p className="text-[9px] text-white/80 font-medium">Replies instantly • WhatsApp Business Verified</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[9px] font-semibold tracking-wider uppercase text-white/90">
                        SIMULATION
                      </span>
                    </div>
                  </div>

                  {/* WhatsApp Chat Area */}
                  <div className="flex-1 p-4 space-y-3 bg-[#ece5dd]/40 min-h-[360px] max-h-[420px] overflow-y-auto scrollbar-thin relative flex flex-col justify-end">
                    
                    {/* Background Pattern Overlay */}
                    <div 
                      className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                      style={{
                        backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
                        backgroundSize: "contain"
                      }}
                    />

                    <AnimatePresence initial={false}>
                      {chatSteps.slice(0, chatStep + 1).map((chat, idx) => {
                        const isBot = chat.sender === "bot";
                        const isSystem = chat.sender === "system";

                        if (isSystem) {
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 12, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              className="flex justify-center my-2.5 relative z-10"
                            >
                              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 text-center max-w-[85%] shadow-sm">
                                {chat.text}
                              </div>
                            </motion.div>
                          );
                        }

                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: isBot ? -12 : 12, y: 8 }}
                            animate={{ opacity: 1, x: 0, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className={`flex ${isBot ? "" : "justify-end"} relative z-10`}
                          >
                            <div
                              className={`rounded-2xl px-4 py-2.5 text-xs max-w-[80%] shadow-sm relative leading-relaxed ${
                                isBot
                                  ? "rounded-tl-none bg-card border border-border/80 text-foreground"
                                  : "rounded-tr-none bg-[#e1ffc7] dark:bg-[#056162] text-foreground dark:text-white"
                              }`}
                            >
                              <p className="whitespace-pre-line">{chat.text}</p>
                              
                              {/* Custom Interactive Elements inside chatbot response */}
                              {isBot && chat.hasButton && (
                                <div className="mt-3 pt-2 border-t border-border/50">
                                  <button className="flex items-center justify-center gap-1.5 w-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 font-bold px-3 py-1.5 rounded-lg border border-emerald-500/20 transition-all">
                                    <MessageSquare className="h-3 w-3" />
                                    View Digital Menu
                                  </button>
                                </div>
                              )}

                              {isBot && chat.hasConfirm && (
                                <div className="mt-3 flex gap-2 pt-2 border-t border-border/50">
                                  <button className="flex-1 bg-primary text-white font-bold py-1 px-2 rounded-md border border-primary/20 text-[10px]">
                                    Confirm Order
                                  </button>
                                  <button className="flex-1 bg-secondary text-muted-foreground font-semibold py-1 px-2 rounded-md border border-border text-[10px]">
                                    Modify Cart
                                  </button>
                                </div>
                              )}

                              {isBot && chat.hasPayButton && (
                                <div className="mt-3 pt-2 border-t border-border/50">
                                  <button className="flex items-center justify-center gap-1.5 w-full bg-primary text-white font-bold px-3 py-1.5 rounded-lg hover:bg-primary/95 transition-all text-[11px] shadow-sm">
                                    <CreditCard className="h-3.5 w-3.5" />
                                    Pay via UPI / Cards (₹350)
                                  </button>
                                </div>
                              )}

                              <span className="block text-[8px] text-muted-foreground/80 mt-1 text-right">
                                {chat.time}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      </AuroraBackground>
    </section>
  );
}

// ═══════════════════════════════════════════════
// LOGOS — Infinite Scrolling Sleek Monochrome Marquee
// ═══════════════════════════════════════════════

function LogosSection() {
  const brandLogos = [
    { name: "Spice Garden", cuisine: "North Indian" },
    { name: "The Food Studio", cuisine: "Continental" },
    { name: "Biryani House", cuisine: "Hyderabadi" },
    { name: "Tandoor Express", cuisine: "Mughlai" },
    { name: "Chai & More", cuisine: "Cafe" },
    { name: "Curry Nation", cuisine: "Traditional" },
    { name: "Pizzeria Deluxe", cuisine: "Italian" },
    { name: "Sutra Kitchen", cuisine: "Fusion" },
  ];

  return (
    <section className="py-10 border-y border-border/40 bg-secondary/10 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-[10px] font-bold tracking-widest text-muted-foreground uppercase mb-6">
          empowering premier restaurants across india
        </p>
        
        {/* Infinite Scrolling Marquee */}
        <Marquee speed={25} className="py-2">
          {brandLogos.map((brand, index) => (
            <div
              key={`${brand.name}-${index}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 bg-card hover:bg-secondary/40 hover:border-border transition-all duration-300 shadow-sm mx-2"
            >
              <div className="h-2 w-2 rounded-full bg-primary/80" />
              <span className="text-xs font-bold text-foreground">{brand.name}</span>
              <span className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                {brand.cuisine}
              </span>
            </div>
          ))}
        </Marquee>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// STATS — Glassmorphic Accent Widgets
// ═══════════════════════════════════════════════

function StatsSection() {
  const stats = [
    { value: 500, suffix: "+", label: "Partner Restaurants", desc: "Active outlets nationwide", icon: Users },
    { value: 120000, suffix: "+", label: "Orders Fulfilled", desc: "Automated via AI intake", icon: ShoppingCart },
    { value: 99.9, decimal: 1, suffix: "%", label: "Chat API Uptime", desc: "Enterprise SLA standard", icon: Shield },
    { value: 42, suffix: "%", label: "Avg. Revenue Boost", desc: "Direct sales & repeat orders", icon: TrendingUp },
  ];

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden bg-background">
      {/* Background radial soft light */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" staggerDelay={0.08}>
          {stats.map((stat) => (
            <StaggerItem key={stat.label}>
              <div className="group relative p-6 rounded-2xl border border-border/80 bg-card hover:border-primary/30 transition-all duration-300 glass glass-interactive shadow-sm">
                
                {/* Visual back glow on card hover */}
                <div className="absolute inset-0 bg-primary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-[2px]" />
                
                <div className="relative z-10">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 transition-transform duration-300 group-hover:scale-110">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  
                  <p className="text-4xl font-extrabold text-foreground font-mono leading-none tracking-tight">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </p>
                  
                  <h3 className="mt-3 text-sm font-bold text-foreground">{stat.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{stat.desc}</p>
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
// FEATURES — High-End Bento Grid Configuration
// ═══════════════════════════════════════════════

function FeaturesSection() {
  const [langIdx, setLangIdx] = useState(0);
  const languages = ["English", "हिन्दी (Hindi)", "தமிழ் (Tamil)", "తెలుగు (Telugu)", "ಕನ್ನಡ (Kannada)", "मराठी (Marathi)"];

  // Multilingual auto-rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setLangIdx((prev) => (prev === languages.length - 1 ? 0 : prev + 1));
    }, 2000);
    return () => clearInterval(timer);
  }, [languages.length]);

  return (
    <section id="features" className="py-20 sm:py-28 bg-secondary/20 relative border-t border-border/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <SectionReveal>
          <div className="mx-auto max-w-3xl text-center mb-16">
            <span className="text-xs font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">
              ENTERPRISE SUITE
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl leading-tight font-heading">
              Everything Your Kitchen Needs to Scale
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Ditch the complex tablet setups. AssistMint integrates AI conversational intake
              directly with automated payments, invoicing, and target marketing.
            </p>
          </div>
        </SectionReveal>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          
          {/* Card 1: AI Chatbot Engine (Spans 2 columns, tall) */}
          <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 md:p-8 flex flex-col justify-between overflow-hidden shadow-sm hover:border-primary/30 transition-all duration-300 group relative">
            {/* Soft Glowing Grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808003_1px,transparent_1px),linear-gradient(to_bottom,#80808003_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />
            
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground font-heading">
                AI Conversational Chatbot Engine
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
                Understands colloquial phrasing, automatically manages menu add-ons, handles item adjustments, and suggests popular meal combinations to maximize average order value.
              </p>
            </div>

            {/* Floating Visual UI (Simulated Chat Bubble Stack) */}
            <div className="mt-6 p-4 rounded-xl bg-secondary/30 border border-border/40 relative">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px]">👨</div>
                  <div className="bg-[#e1ffc7] dark:bg-emerald-950/40 p-2 rounded-xl text-xs max-w-[80%] text-foreground leading-snug">
                    Can I get 1 Butter Chicken but make it extra spicy? 🌶️
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <div className="bg-card border border-border/80 p-2 rounded-xl text-xs max-w-[80%] text-foreground leading-snug">
                    Sure! 🌿 Added to cart. I've noted "extra spicy" for the chef. Anything else?
                  </div>
                  <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">🤖</div>
                </div>
              </div>
              {/* Pulse Indicator */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400">AI WORKING</span>
              </div>
            </div>
          </div>

          {/* Card 2: Auto Payments via Cashfree (Spans 1 column) */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-sm hover:border-primary/30 transition-all duration-300 group">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground font-heading">
                Cashfree Auto Payments
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Generate dynamic UPI QR codes and pay links directly inside the chat. Instantly confirms receipt on payment completion.
              </p>
            </div>

            {/* Payment Success floating pill */}
            <div className="mt-6 flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[11px]">
                  ✓
                </div>
                <div>
                  <p className="text-[10px] font-bold text-foreground">Cashfree Hook</p>
                  <p className="text-[8px] text-muted-foreground">Order #9021 Received</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                ₹320 PAID
              </span>
            </div>
          </div>

          {/* Card 3: Smart Digital Menu Layout (Spans 1 column) */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-sm hover:border-primary/30 transition-all duration-300 group">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground font-heading">
                Smart Digital Menu
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Clean, accessible web menu links open straight from WhatsApp. Customers browse dishes, select add-ons, and add items instantly.
              </p>
            </div>

            {/* Menu item micro widget */}
            <div className="mt-6 p-2 rounded-xl bg-secondary/30 border border-border/40 space-y-1.5">
              <div className="flex items-center justify-between text-xs p-1.5 rounded bg-card border border-border/30">
                <span className="font-semibold">Paneer Butter Masala</span>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full hover:scale-105 transition-transform cursor-pointer">
                  ₹250 Add +
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Multilingual Order Intake (Spans 2 columns) */}
          <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 md:p-8 flex flex-col justify-between shadow-sm hover:border-primary/30 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
            
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Globe className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground font-heading">
                8+ Native Indian Languages
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
                Break language barriers completely. Customers chat and order naturally in their mother tongue, including Hindi, Tamil, Telugu, Marathi, and Kannada.
              </p>
            </div>

            {/* Rotating Language flags preview */}
            <div className="mt-6 flex flex-wrap gap-2.5">
              {languages.map((lang, idx) => (
                <span
                  key={lang}
                  className={`text-xs px-3.5 py-1.5 rounded-xl border font-semibold transition-all duration-300 ${
                    idx === langIdx
                      ? "bg-primary border-primary text-primary-foreground scale-105 shadow-sm shadow-primary/10"
                      : "bg-secondary/40 border-border text-muted-foreground"
                  }`}
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>

          {/* Card 5: Real-Time Business Analytics (Spans 1 column) */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-sm hover:border-primary/30 transition-all duration-300 group">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground font-heading">
                Real-Time Analytics
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Live monitoring of customer chats, daily revenues, popular food categories, and peak ordering heatmap.
              </p>
            </div>

            {/* Small analytics indicator bar */}
            <div className="mt-6 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: "70%" }} />
              </div>
              <span className="text-[10px] font-bold text-foreground">70% Repeat Rate</span>
            </div>
          </div>

          {/* Card 6: GST Compliance & Digital Receipts (Spans 1 column) */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-sm hover:border-primary/30 transition-all duration-300 group">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground font-heading">
                GST & Receipt Compliance
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Automatically generate and send tax-compliant CGST/SGST breakdowns and itemized digital receipts to clients.
              </p>
            </div>

            {/* Receipt Preview Icon snippet */}
            <div className="mt-6 flex items-center justify-center py-2 border-t border-dashed border-border/60">
              <span className="text-[10px] tracking-widest font-mono text-muted-foreground uppercase flex items-center gap-1.5">
                ✦ RECEIPT GENERATED ✦
              </span>
            </div>
          </div>

          {/* Card 7: Campaigns & Loyalty Programs (Spans 1 column) */}
          <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between shadow-sm hover:border-primary/30 transition-all duration-300 group">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight text-foreground font-heading">
                Loyalty & Outreach Campaigns
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Deliver target campaign announcements and reward loyalty points to customers right on their chat window.
              </p>
            </div>

            {/* Loyalty points card mockup */}
            <div className="mt-6 p-3 rounded-xl bg-secondary/50 border border-border/60 shadow-sm relative overflow-hidden flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full tracking-wider uppercase">
                  Loyalty Campaign
                </span>
                <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  🌿 +50 Points
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed text-left font-medium">
                Welcome back! Order your usual today to redeem ₹50 off instantly!
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// HOW IT WORKS — Premium Stepper sequences
// ═══════════════════════════════════════════════

function HowItWorksSection() {
  const steps = [
    {
      step: "01",
      title: "Add Your Digital Menu",
      desc: "Register your restaurant, list categories, items, and pricing in our premium merchant control panel in under 10 minutes.",
    },
    {
      step: "02",
      title: "Link Your WhatsApp API",
      desc: "Connect your official WhatsApp Business number securely. We handle the technical Meta setup with zero complex coding required.",
    },
    {
      step: "03",
      title: "Launch the AI Chatbot",
      desc: "Your dedicated AI intake engine immediately begins greeting customers, recommending cuisines, and accepting orders.",
    },
    {
      step: "04",
      title: "Scale Direct Orders",
      desc: "Accept Cashfree payments instantly, retain precious profit margins, and deliver customized loyalty code promotions.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 relative overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <SectionReveal>
          <div className="mx-auto max-w-3xl text-center mb-16">
            <span className="text-xs font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">
              SIMPLE SETUP FLOW
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl leading-tight font-heading">
              Ready in Four Fast Steps
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              No long consulting processes. Configure, connect, and go live instantly.
            </p>
          </div>
        </SectionReveal>

        {/* Stepper Row */}
        <div className="relative mx-auto mt-16 max-w-6xl">
          {/* Stepper connecting vector path (desktop) */}
          <div className="absolute top-[38px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-emerald-500/10 via-emerald-500/60 to-emerald-500/10 hidden lg:block pointer-events-none" />

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8" staggerDelay={0.1}>
            {steps.map((item, idx) => (
              <StaggerItem key={item.step}>
                <div className="relative flex flex-col items-center lg:items-start text-center lg:text-left group cursor-default">
                  
                  {/* Stepper bubble number */}
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-card border border-border shadow-sm group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/5 transition-all duration-300 z-10">
                    <span className="font-mono text-lg font-black text-primary">
                      {item.step}
                    </span>
                  </div>
                  
                  <h3 className="mt-6 text-base font-bold text-foreground tracking-tight font-heading group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>

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
// PRICING — Interactive Monthly/Yearly toggle Pill
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
    <section id="pricing" className="py-20 sm:py-28 bg-secondary/20 relative border-t border-border/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <SectionReveal>
          <div className="mx-auto max-w-3xl text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">
              TRANSPARENT PRICING
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl leading-tight font-heading">
              Flexible Plans to Scale Profits
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Try our Starter Plan completely free for 14 days. Save 20% on yearly billing. Zero commission commitments.
            </p>
          </div>
        </SectionReveal>

        {/* Pricing billing slider pill */}
        <div className="flex items-center justify-center mb-16">
          <div className="relative flex p-1 bg-card rounded-full border border-border/80 shadow-inner">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`relative z-10 px-5 py-2 text-xs font-bold transition-all duration-300 rounded-full cursor-pointer ${
                billingPeriod === "monthly"
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`relative z-10 px-5 py-2 text-xs font-bold transition-all duration-300 rounded-full gap-1.5 flex items-center cursor-pointer ${
                billingPeriod === "yearly"
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly Billing
              <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold px-1.5 py-0.5 rounded-full">
                SAVE 20%
              </span>
            </button>
            
            {/* Sliding Pill Indicator */}
            <motion.div
              className="absolute top-1 bottom-1 bg-primary rounded-full z-0"
              initial={false}
              animate={{
                left: billingPeriod === "monthly" ? "4px" : "124px",
                width: billingPeriod === "monthly" ? "116px" : "138px",
              }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            />
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto items-stretch" staggerDelay={0.06}>
          {plans.map((plan) => {
            const activePrice = billingPeriod === "monthly" ? plan.priceMonthly : plan.priceYearly;

            return (
              <StaggerItem key={plan.name} className="h-full">
                <div className={`relative rounded-2xl border p-6 h-full flex flex-col justify-between transition-all duration-400 hover:-translate-y-1 shadow-sm ${
                  plan.popular
                    ? "border-primary bg-card scale-[1.02] lg:scale-[1.03] shadow-md shadow-primary/5 relative z-10"
                    : "border-border bg-card hover:border-primary/20"
                }`}>
                  
                  {/* Decorative gradient for popular card */}
                  {plan.popular && (
                    <>
                      <div className="absolute top-0 inset-x-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 animate-gradient" />
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-primary px-4 py-1 text-[10px] font-black text-primary-foreground shadow-sm uppercase tracking-widest">
                        <Star className="h-2.5 w-2.5 fill-current" />
                        BEST VALUE
                      </div>
                    </>
                  )}

                  {/* Trial badge for Starter */}
                  {plan.trial && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-4 py-1 text-[10px] font-black text-white shadow-sm uppercase tracking-widest">
                      <Sparkles className="h-2.5 w-2.5" />
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    <h3 className="text-base font-bold text-foreground tracking-tight font-heading">
                      {plan.name}
                    </h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      {plan.priceMonthly === 0 ? (
                        <span className="text-3xl font-extrabold tracking-tight font-heading">Free</span>
                      ) : (
                        <>
                          <span className="text-3xl font-extrabold tracking-tight font-heading">
                            ₹{activePrice.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-muted-foreground font-semibold">/month</span>
                        </>
                      )}
                    </div>
                    {plan.priceMonthly === 0 && (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block mt-1.5">
                        Free forever — no credit card needed
                      </span>
                    )}
                    {billingPeriod === "yearly" && plan.priceMonthly > 0 && (
                      <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block mt-1.5">
                        Billed annually · Save ₹{((plan.priceMonthly * 12) - (plan.priceYearly * 12)).toLocaleString("en-IN")}/yr
                      </span>
                    )}
                    <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
                      {plan.description}
                    </p>

                    <ul className="mt-5 space-y-2.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0 bg-emerald-500/10 rounded-full p-0.5" />
                          <span className="leading-normal">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-3 border-t border-border/40">
                    <Link
                      href="/signup"
                      className={`flex h-10 w-full items-center justify-center rounded-xl text-xs font-bold transition-all gap-1.5 group cursor-pointer ${
                        plan.popular
                          ? "bg-primary text-primary-foreground hover:bg-primary/95 shadow-md shadow-primary/10"
                          : plan.trial
                            ? "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/10"
                            : "border border-border text-foreground hover:bg-secondary hover:border-border/80"
                      }`}
                    >
                      {plan.cta}
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>

                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════
// TESTIMONIALS — Verified user reviews
// ═══════════════════════════════════════════════

function TestimonialsSection() {
  const reviews = [
    {
      name: "Rajesh Kumar",
      role: "Owner",
      restaurant: "Spice Garden",
      city: "Jaipur",
      initial: "R",
      avatarBg: "bg-emerald-500/10 text-emerald-600",
      text: "Our orders grew by 42% in the very first month. Customers love using the chatbot in Hindi, and we save thousands in platform margins monthly.",
      rating: 5,
    },
    {
      name: "Priya Sharma",
      role: "General Manager",
      restaurant: "The Food Studio",
      city: "Mumbai",
      initial: "P",
      avatarBg: "bg-teal-500/10 text-teal-600",
      text: "AssistMint completely eliminated missed calls during heavy rush hours. The conversational AI takes up to 250 orders on autopilot every single day.",
      rating: 5,
    },
    {
      name: "Arjun Reddy",
      role: "Founder",
      restaurant: "Biryani House",
      city: "Hyderabad",
      initial: "A",
      avatarBg: "bg-purple-500/10 text-purple-600",
      text: "UPI payment collection via Cashfree is instantaneous. The system verifies payment and routes order details to our chef automatically. 10/10 setup.",
      rating: 5,
    },
  ];

  return (
    <section className="py-20 sm:py-24 relative overflow-hidden bg-background border-t border-border/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <SectionReveal>
          <div className="mx-auto max-w-3xl text-center mb-16">
            <span className="text-xs font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">
              RESTOURANT SUCCESS STORIES
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl leading-tight font-heading">
              Loved by Kitchen Leaders
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Explore reviews from premier restaurant outlets processing orders on autopilot.
            </p>
          </div>
        </SectionReveal>

        {/* Review Cards Grid */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto" staggerDelay={0.08}>
          {reviews.map((rev) => (
            <StaggerItem key={rev.name}>
              <div className="group h-full p-6 rounded-2xl border border-border bg-card flex flex-col justify-between hover:border-primary/20 transition-all duration-300 glass glass-interactive shadow-sm">
                
                <div>
                  {/* Rating Stars & Verification Tag */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Shield className="h-2.5 w-2.5" />
                      VERIFIED CLIENT
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic">
                    &ldquo;{rev.text}&rdquo;
                  </p>
                </div>

                {/* Avatar and Info */}
                <div className="mt-6 flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm border border-border/40 shadow-inner ${rev.avatarBg}`}>
                    {rev.initial}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-foreground leading-none">
                      {rev.name}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      {rev.role}, <span className="font-semibold text-foreground">{rev.restaurant}</span> • {rev.city}
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
// FAQ — Elegant accordion drawer lists
// ═══════════════════════════════════════════════

function FAQSection() {
  const faqs = [
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
      a: "The conversational bot currently processes queries and orders in 8+ regional languages, including English, Hindi (हिंदी), Tamil (தமிழ்), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), and Marathi (मराठी).",
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

  return (
    <section id="faq" className="py-20 sm:py-28 bg-secondary/20 relative border-t border-border/30">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        
        <SectionReveal>
          <div className="text-center mb-16">
            <span className="text-xs font-bold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full">
              HAVE QUESTIONS?
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl leading-tight font-heading">
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed">
              Explore support insights and key technical details on AssistMint.
            </p>
          </div>
        </SectionReveal>

        {/* Accordions */}
        <StaggerContainer className="space-y-3" staggerDelay={0.05}>
          {faqs.map((faq) => (
            <StaggerItem key={faq.q}>
              <FAQAccordion question={faq.q} answer={faq.a} />
            </StaggerItem>
          ))}
        </StaggerContainer>

      </div>
    </section>
  );
}

function FAQAccordion({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border/80 bg-card overflow-hidden transition-all duration-300 hover:border-primary/20 shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-left hover:bg-secondary/40 transition-colors cursor-pointer"
      >
        <span className="text-xs sm:text-sm font-bold pr-4 text-foreground leading-snug">
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="px-5 pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/20 pt-2.5">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════
// CTA — Premium Gradient Mesh & Action trigger
// ═══════════════════════════════════════════════

function CTASection() {
  const [emailInput, setEmailInput] = useState("");

  const handleCTASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    window.location.href = `/signup?email=${encodeURIComponent(emailInput)}`;
  };

  return (
    <section className="py-20 sm:py-28 relative overflow-hidden bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="relative rounded-3xl bg-card border border-border/80 p-8 sm:p-16 text-center overflow-hidden shadow-xl">
            
            {/* Glowing mesh background blobs */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute top-0 left-1/4 h-[300px] w-[300px] rounded-full bg-primary/10 blur-[100px]" />
              <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[120px]" />
            </div>

            {/* Custom ambient particle elements */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <FloatingParticles />
            </div>

            <div className="relative z-10">
              <span className="text-xs font-bold tracking-widest text-primary uppercase bg-primary/10 px-3.5 py-1.5 rounded-full inline-block">
                GET STARTED IN 10 MINUTES
              </span>
              
              <h2 className="mt-6 text-3xl font-extrabold text-foreground sm:text-5xl tracking-tight leading-tight font-heading max-w-2xl mx-auto">
                Transform Your Restaurant ordering experience
              </h2>
              
              <p className="mt-4 text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Join hundreds of local restaurants scaling direct sales, accepting instant UPI payments, and cutting down aggregators' commission margins.
              </p>

              {/* Action Email Form */}
              <form onSubmit={handleCTASubmit} className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your restaurant email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex h-12 w-full rounded-xl border border-border bg-card px-4 py-3 text-xs font-medium placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-300"
                />
                
                <button
                  type="submit"
                  className="inline-flex h-12 w-full sm:w-auto shrink-0 items-center justify-center rounded-xl bg-primary px-6 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/95 transition-all duration-300 gap-1.5 active:scale-95 cursor-pointer uppercase tracking-wider"
                >
                  Start Starter Trial
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>

              <p className="mt-4 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                🌿 No credit card required • Cancel anytime
              </p>
            </div>

          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
