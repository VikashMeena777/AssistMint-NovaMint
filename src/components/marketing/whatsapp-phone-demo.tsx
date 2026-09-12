"use client";

// AssistMint hero phone demo — realistic WhatsApp conversation loop.
// Adapted from the 21st.dev "Great UI Mobile Mockup" (MIT, id 23322) with an
// AssistMint restaurant-ordering script, true WhatsApp colors, and
// motion/react. No mouse tracking anywhere.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const DoubleCheckIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 11" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.045 0.584961L11.9883 1.52829L5.85833 7.65829L2.55833 4.35829L3.50167 3.41496L5.85833 5.77163L11.045 0.584961ZM14.345 0.584961L15.2883 1.52829L9.15833 7.65829L8.215 6.71496L14.345 0.584961Z" />
  </svg>
);

interface DemoMessage {
  id: number;
  /** who the bubble belongs to — the customer chats WITH the business's AI */
  from: "customer" | "bot";
  text: string;
  /** WhatsApp list-reply button row rendered inside the bubble */
  buttons?: string[];
  time: string;
}

const SCRIPT: DemoMessage[] = [
  { id: 1, from: "customer", text: "Hi! 👋", time: "8:02 PM" },
  {
    id: 2,
    from: "bot",
    text: "Welcome to *Spice Garden* 🌿 I'm your AI assistant. I can take your order in seconds — no waiting, no calls.",
    buttons: ["📋 View Menu", "🔄 Reorder Last", "💬 Talk to Us"],
    time: "8:02 PM",
  },
  { id: 3, from: "customer", text: "View Menu", time: "8:02 PM" },
  {
    id: 4,
    from: "bot",
    text: "🥘 *Paneer Butter Masala* — ₹249\n⭐ Bestseller · 🟢 Veg · ⏱ 20 min\n\n🫓 *Garlic Naan (2)* — ₹99\n🟢 Veg · ⏱ 10 min",
    buttons: ["🛒 Add to Cart"],
    time: "8:03 PM",
  },
  { id: 5, from: "customer", text: "Add 2 naan + 1 paneer", time: "8:03 PM" },
  {
    id: 6,
    from: "bot",
    text: "✅ *Added!*\n\n🛒 Your cart — ₹448\n1× Paneer Butter Masala ₹249\n2× Garlic Naan ₹99\n\nReady to order?",
    buttons: ["💳 Pay via UPI · ₹448", "💵 Cash on Delivery"],
    time: "8:04 PM",
  },
  { id: 7, from: "customer", text: "Pay via UPI", time: "8:04 PM" },
  {
    id: 8,
    from: "bot",
    text: "✅ *Payment received!* ₹448 via UPI\n\n🧾 Order *#1042* confirmed — prep time ~25 min. Receipt & live status coming here. Thank you! 🌿",
    time: "8:04 PM",
  },
];

// Reveal pacing (ms): each message appears after its delay; typing dots show
// before bot messages. Loop resets after the full script + a hold.
const PACING: number[] = [600, 1600, 3400, 4400, 6400, 7400, 9400, 10400];
const LOOP_RESET = 16000;

export function WhatsAppPhoneDemo({ className }: { className?: string }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    let mounted = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Reset inside a timeout (async boundary — no synchronous setState in effect)
    timers.push(
      setTimeout(() => {
        if (!mounted) return;
        setVisibleCount(0);
        setTyping(false);
      }, 0)
    );

    SCRIPT.forEach((msg, i) => {
      const isBot = msg.from === "bot";
      // typing dots lead each bot message
      if (isBot) {
        timers.push(
          setTimeout(() => { if (mounted) setTyping(true); }, PACING[i] - 900)
        );
        timers.push(
          setTimeout(() => {
            if (!mounted) return;
            setTyping(false);
            setVisibleCount(i + 1);
          }, PACING[i])
        );
      } else {
        timers.push(
          setTimeout(() => { if (mounted) setVisibleCount(i + 1); }, PACING[i])
        );
      }
    });

    timers.push(
      setTimeout(() => {
        if (mounted) setCycle((c) => c + 1);
      }, LOOP_RESET)
    );

    return () => {
      mounted = false;
      timers.forEach(clearTimeout);
    };
  }, [cycle]);

  return (
    <div className={cn("relative mx-auto w-full max-w-[285px] select-none", className)}>
      <motion.div
        initial={{ opacity: 0, y: 35, scale: 0.94, rotate: -1.5 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
        className="relative flex h-[530px] w-full flex-col overflow-hidden rounded-[40px] bg-neutral-900 p-2.5 shadow-2xl sm:h-[560px]"
      >
        {/* phone side buttons */}
        <div className="absolute top-24 -left-[5px] h-8 w-[2.5px] rounded-l-xs bg-neutral-700" />
        <div className="absolute top-36 -left-[5px] h-10 w-[2.5px] rounded-l-xs bg-neutral-700" />
        <div className="absolute top-48 -left-[5px] h-10 w-[2.5px] rounded-l-xs bg-neutral-700" />
        <div className="absolute top-32 -right-[5px] h-14 w-[2.5px] rounded-r-xs bg-neutral-700" />

        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[30px] bg-[#efeae2] text-neutral-900">
          {/* status bar */}
          <div className="z-30 flex shrink-0 items-center justify-between bg-[#008069] px-4 pt-2 pb-1 text-[11px] font-semibold text-white">
            <span className="w-10 text-left font-bold tracking-tight">8:04</span>
            <div className="flex items-center gap-1.5 text-white">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="16" width="3.5" height="5" rx="0.5" />
                <rect x="7.5" y="12" width="3.5" height="9" rx="0.5" />
                <rect x="13" y="8" width="3.5" height="13" rx="0.5" />
                <rect x="18.5" y="4" width="3.5" height="17" rx="0.5" />
              </svg>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <svg className="h-2.5 w-4" fill="none" viewBox="0 0 24 14" stroke="currentColor" strokeWidth={2}>
                <rect x="1" y="1" width="18" height="12" rx="3" />
                <rect x="3" y="3" width="11" height="8" rx="1.5" fill="currentColor" />
                <path d="M21 4v6" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* chat header */}
          <div className="z-20 flex shrink-0 items-center justify-between bg-[#008069] px-3 py-1.5 text-white">
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-700 text-[11px] font-bold">
                <span>SG</span>
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="max-w-[120px] truncate text-[11.5px] leading-tight font-semibold">Spice Garden</span>
                <span className="mt-0.5 text-[9.5px] leading-none font-medium text-emerald-200">AI assistant · online</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-white/90">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 7l-7 5 7 5V7z" />
                <rect x="1" y="5" width="15" height="14" rx="2" />
              </svg>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </div>
          </div>

          {/* messages */}
          <div className="relative flex min-h-0 flex-1 flex-col justify-end overflow-hidden bg-[#efeae2] p-2.5">
            <div className="mx-auto mb-1.5 rounded-full bg-white/90 px-2.5 py-0.5 text-[9px] font-medium text-neutral-600">
              Today
            </div>
            <div className="flex flex-1 flex-col justify-end space-y-1.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <AnimatePresence mode="sync">
                {SCRIPT.slice(0, visibleCount).map((msg) => (
                  <motion.div
                    key={`${cycle}-${msg.id}`}
                    initial={{ opacity: 0, y: 10, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={cn("flex flex-col", msg.from === "customer" ? "items-end" : "items-start")}
                  >
                    <div
                      className={cn(
                        "flex max-w-[85%] flex-col rounded-xl px-2.5 py-1.5 text-[11px] leading-snug",
                        msg.from === "customer"
                          ? "rounded-tr-none bg-[#dcf8c6] text-neutral-900"
                          : "rounded-tl-none bg-white text-neutral-900 shadow-sm",
                      )}
                    >
                      <p className="whitespace-pre-line">{msg.text}</p>
                      {msg.buttons && (
                        <div className="mt-1.5 flex flex-col gap-1 border-t border-black/5 pt-1.5">
                          {msg.buttons.map((b) => (
                            <span
                              key={b}
                              className="rounded-md bg-[#f0f7ff] px-2 py-1 text-center text-[10.5px] font-semibold text-[#008069]"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-0.5 flex items-center justify-end gap-1 self-end">
                        <span className="text-[8.5px] text-neutral-400">{msg.time}</span>
                        {msg.from === "customer" && <DoubleCheckIcon className="h-3 w-3 text-[#34b7f1]" />}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {typing && (
                  <motion.div key={`typing-${cycle}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-start">
                    <div className="flex items-center gap-1 rounded-xl rounded-tl-none bg-white px-3 py-2 shadow-sm">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* input bar */}
          <div className="z-20 flex shrink-0 items-center gap-1.5 bg-[#f0f2f5] p-2">
            <button type="button" className="p-1 text-neutral-500" aria-label="Emoji">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth={3} />
                <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth={3} />
              </svg>
            </button>
            <div className="flex flex-1 items-center justify-between rounded-full bg-white px-3 py-1.5 text-xs text-neutral-400">
              <span className="truncate">Message</span>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
          </div>

          {/* home indicator */}
          <div className="flex shrink-0 justify-center bg-[#f0f2f5] pt-0.5 pb-1.5">
            <div className="h-1 w-24 rounded-full bg-neutral-400" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
