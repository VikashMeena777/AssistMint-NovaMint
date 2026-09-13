"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
import { StaggerContainer, StaggerItem as CardStaggerItem } from "@/components/marketing/animated-primitives";
import { ElevateCard } from "@/components/marketing/section-bits";
import { spring } from "@/components/motion/tokens";
import { cn } from "@/lib/utils";

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
              className={`relative rounded-full px-5 py-2.5 text-xs font-bold transition-colors ${
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

/** The interactive half of pricing — billing toggle + plan cards. */
export function PricingPlans() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  return (
    <>
      <div className="mb-14">
        <BillingToggle value={billingPeriod} onChange={setBillingPeriod} />
      </div>

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
                  {/* Growth gets the rotated marigold seal stamp — outline, ≤5% surface */}
                  {plan.popular && (
                    <span className="absolute -top-3 right-4 z-10 inline-flex rotate-[-6deg] items-center rounded-full border-2 border-seal bg-card px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-seal shadow-sm">
                      Best Value
                    </span>
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
                      <div className="mt-3 flex items-baseline gap-1 tabular-nums">
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
                        <span className="mt-1.5 inline-block rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
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
    </>
  );
}
