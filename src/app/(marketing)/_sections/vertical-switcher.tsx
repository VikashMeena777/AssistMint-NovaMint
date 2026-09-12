"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import {
  SectionReveal,
} from "@/components/marketing/animated-primitives";
import { Eyebrow, ElevateCard } from "@/components/marketing/section-bits";
import { spring } from "@/components/motion/tokens";

// ═══════════════════════════════════════════════
// 5 — VERTICAL SWITCHER (P4 layoutId pill) — client island (state).
//     Each panel carries a list of capability rows with a 3px cobalt
//     left-edge accent on hover (transform/opacity only).
// ═══════════════════════════════════════════════

const VERTICALS = [
  {
    id: "restaurant",
    tab: "Restaurant",
    line: "Orders and table bookings taken mid-rush — in English or Hinglish.",
    q: "Table for 4 at 9?",
    a: "Booked ✓ 9:00 pm, table for 4. See you tonight!",
    points: ["Menu + daily specials on demand", "Table bookings confirmed instantly", "UPI payment links inside the chat"],
  },
  {
    id: "salon",
    tab: "Salon",
    line: "Slots offered, confirmed and rescheduled — without a single phone call.",
    q: "Sunday slot for haircut?",
    a: "Confirmed — Sunday 11:00 am with Ravi. Reply R to reschedule.",
    points: ["Open slots offered with alternatives", "Confirm or reschedule by a single reply", "Reminders sent before every visit"],
  },
  {
    id: "clinic",
    tab: "Clinic",
    line: "Tokens, timings and doctor availability — answered without disturbing the front desk.",
    q: "Dr. Mehta available tomorrow?",
    a: "Yes — token 14, 10:20 am. Shall I book it?",
    points: ["Token and timing queries answered", "Bookings without front-desk calls", "Visit fee + report details shared up front"],
  },
  {
    id: "coaching",
    tab: "Coaching",
    line: "Demo-class enquiries booked and reminded, so batches fill themselves.",
    q: "Physics demo class?",
    a: "Saturday 5–6 pm, free demo. Seat reserved ✓",
    points: ["Demo-class seats held instantly", "Batch details and timings on ask", "Reminders so seats actually fill"],
  },
  {
    id: "retail",
    tab: "Retail",
    line: "Stock questions answered in seconds; items held till the customer walks in.",
    q: "Do you have this in blue?",
    a: "Yes — M and L in blue. Reserved till 8 pm under your name.",
    points: ["Stock checks answered in seconds", "Items reserved till pickup", "Size and variant questions handled"],
  },
  {
    id: "services",
    tab: "Services",
    line: "Quotes sent, visits scheduled and follow-ups chased — on WhatsApp.",
    q: "AC repair quote?",
    a: "Visit + check ₹449. Tomorrow 11 am slot open — book?",
    points: ["Quotes sent straight on WhatsApp", "Visit slots booked and rescheduled", "Follow-ups chased automatically"],
  },
];

function MiniChat({ q, a }: { q: string; a: string }) {
  return (
    <ElevateCard>
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
    </ElevateCard>
  );
}

export function VerticalSwitcherSection() {
  const [active, setActive] = useState(VERTICALS[0].id);
  const current = VERTICALS.find((v) => v.id === active) ?? VERTICALS[0];

  return (
    <section id="features" className="rule-y scroll-mt-24 bg-secondary/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <Eyebrow index="03">Features</Eyebrow>
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

                {/* Capability rows — 3px cobalt left-edge accent on hover */}
                <ul className="mt-5 space-y-1.5">
                  {current.points.map((point) => (
                    <li
                      key={point}
                      className="group relative flex items-center gap-2.5 rounded-lg py-1.5 pl-3.5 pr-2 text-sm text-muted-foreground transition-transform duration-150 ease-out hover:translate-x-0.5 motion-reduce:transform-none motion-reduce:transition-none"
                    >
                      <span
                        aria-hidden
                        className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100 motion-reduce:transition-none motion-reduce:opacity-0"
                      />
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <MiniChat q={current.q} a={current.a} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
