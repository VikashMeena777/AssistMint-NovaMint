"use client";

// ChatThreadDemo — the hero centerpiece (research-interactions Hero A + §5).
// A WhatsApp-style THREAD CARD (no bezel, no notch) that plays a scripted
// order loop: P1 autoplay script, P12 typing indicator + presence swap,
// P13 tick morph + smart-reply chips. All motion is transform/opacity on
// springs with damping ≥ 25 (motion/tokens). The loop pauses when the tab
// is hidden and replays forever. WhatsApp green appears only via the
// sanctioned .wa-* chat-chrome classes.

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, CheckCheck, Send } from "lucide-react";
import { spring } from "@/components/motion/tokens";

type TickStatus = "sent" | "delivered" | "read";

interface Msg {
  id: string;
  from: "customer" | "bot";
  text: string;
  time: string;
  status: TickStatus;
}

type Step =
  | { kind: "in"; from: "customer" | "bot"; text: string; time: string; markRead?: boolean; delay: number }
  | { kind: "status"; to: TickStatus; delay: number }
  | { kind: "typing"; ms: number }
  | { kind: "chips"; labels: string[]; delay: number }
  | { kind: "loop"; delay: number };

// The single source of truth for the demo (₹448 order script).
// Index 5 is the customer's reply — tapping a smart-reply chip jumps there.
const CUSTOMER_REPLY_STEP = 5;

const SCRIPT: Step[] = [
  { kind: "in", from: "customer", text: "2 paneer tikka rolls + 1 cold coffee", time: "7:38 pm", delay: 1000 },
  { kind: "status", to: "delivered", delay: 350 },
  { kind: "typing", ms: 1100 },
  { kind: "in", from: "bot", text: "Done! Total ₹448. Pay via UPI?", time: "7:38 pm", markRead: true, delay: 500 },
  { kind: "chips", labels: ["Send payment link", "Menu please"], delay: 1700 },
  { kind: "in", from: "customer", text: "yes please", time: "7:39 pm", delay: 350 },
  { kind: "status", to: "delivered", delay: 350 },
  { kind: "typing", ms: 900 },
  { kind: "in", from: "bot", text: "Link sent ✓ Order #1207 confirmed for 7:40 pm", time: "7:39 pm", markRead: true, delay: 400 },
  { kind: "loop", delay: 2600 },
];

function lastIndexOf<T>(arr: T[], pred: (x: T) => boolean): number {
  let idx = -1;
  for (let i = 0; i < arr.length; i++) if (pred(arr[i])) idx = i;
  return idx;
}

export function ChatThreadDemo({ className = "" }: { className?: string }) {
  const [step, setStep] = useState(0);
  const [loops, setLoops] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const [orderChip, setOrderChip] = useState(false);
  const [visible, setVisible] = useState(true);

  // Pause the loop when the tab is hidden (battery + MotionConfig net).
  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    onVis();
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Effect A — apply the current step's state mutation (runs on step change only,
  // so a visibility toggle can never double-apply a message). Applied inside a
  // timeout (async boundary — no synchronous setState in effect).
  useEffect(() => {
    const chipTimer = { t: null as ReturnType<typeof setTimeout> | null };
    const t = setTimeout(() => {
      const s = SCRIPT[step % SCRIPT.length];
      switch (s.kind) {
        case "in": {
          setMsgs((m) => [
            ...m,
            {
              id: `${loops}-${step}`,
              from: s.from,
              text: s.text,
              time: s.time,
              status: s.from === "customer" ? "sent" : "read",
            },
          ]);
          if (s.from === "customer") setChips([]);
          if (s.markRead) {
            // The payoff beat: read-tick fires the moment the reply lands.
            setMsgs((m) => {
              const idx = lastIndexOf(m, (x) => x.from === "customer");
              if (idx === -1) return m;
              const copy = [...m];
              copy[idx] = { ...copy[idx], status: "read" };
              return copy;
            });
          }
          break;
        }
        case "status": {
          setMsgs((m) => {
            const idx = lastIndexOf(m, (x) => x.from === "customer");
            if (idx === -1) return m;
            const copy = [...m];
            copy[idx] = { ...copy[idx], status: s.to };
            return copy;
          });
          break;
        }
        case "typing":
          setTyping(true);
          break;
        case "chips":
          setChips(s.labels);
          break;
        case "loop": {
          // Outcome chip springs in at the card's top-right, then fades.
          setOrderChip(true);
          chipTimer.t = setTimeout(() => setOrderChip(false), 1900);
          break;
        }
      }
    }, 0);
    return () => {
      clearTimeout(t);
      if (chipTimer.t) clearTimeout(chipTimer.t);
    };
  }, [step, loops]);

  // Effect B — schedule the next beat; suspended while the tab is hidden.
  useEffect(() => {
    if (!visible) return;
    const s = SCRIPT[step % SCRIPT.length];
    const delay = s.kind === "typing" ? s.ms : s.delay;
    const t = setTimeout(() => {
      if (s.kind === "loop") {
        setMsgs([]);
        setChips([]);
        setTyping(false);
        setLoops((l) => l + 1);
        setStep(0);
      } else {
        setTyping(false);
        setStep((v) => v + 1);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [step, visible]);

  return (
    <div className={`w-full max-w-md select-none ${className}`}>
      <div className="flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* ── Header: business identity + presence (P12) ── */}
        <div className="flex items-center gap-3 border-b bg-secondary/40 px-4 py-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-heading text-sm font-semibold text-primary-foreground">
            S
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-card-foreground">
              Sharma Ji Café
            </p>
            <PresenceText typing={typing} />
          </div>
          <span className="shrink-0 rounded-full border bg-card px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            Mint AI
          </span>
        </div>

        {/* ── Transcript ── */}
        <div
          aria-live="polite"
          aria-label="Demo conversation — a customer ordering on WhatsApp while the AI assistant replies"
          className="relative flex h-[420px] flex-col justify-end gap-2 overflow-hidden px-4 py-3"
        >
          <span className="self-center rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Today
          </span>

          {msgs.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}

          {typing && <TypingBubble key={`typing-${loops}-${step}`} />}

          {/* Smart-reply chips (P13) — real buttons; tap fast-forwards the script */}
          <AnimatePresence>
            {chips.length > 0 && !typing && (
              <motion.div
                key="chip-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="flex flex-wrap gap-2"
              >
                {chips.map((c, i) => (
                  <motion.button
                    key={c}
                    type="button"
                    onClick={() => setStep(CUSTOMER_REPLY_STEP)}
                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ ...spring.entrance, delay: i * 0.06 }}
                    className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
                  >
                    {c}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Outcome chip — chat → result in one beat */}
          <AnimatePresence>
            {orderChip && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.9, transition: { duration: 0.2 } }}
                transition={spring.snappy}
                className="absolute right-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-md"
              >
                <CheckCheck className="size-3" strokeWidth={2.5} />
                Order #1207 · ₹448 · confirmed
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Input row (static chrome) ── */}
        <div className="flex items-center gap-2 border-t bg-secondary/40 px-4 py-2.5">
          <div className="flex-1 rounded-full border bg-card px-4 py-2 text-xs text-muted-foreground">
            Type a message…
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-full border bg-card">
            <Send className="size-4 wa-green" />
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Bubble (§5.1 geometry: customer = green out, bot = card + hairline border) ──

function Bubble({ msg }: { msg: Msg }) {
  const isCustomer = msg.from === "customer";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring.entrance}
      className={`flex max-w-[78%] flex-col px-3.5 py-2 text-[13px] leading-snug shadow-sm ${
        isCustomer
          ? "wa-bubble-out self-end rounded-2xl rounded-tr-sm"
          : "self-start rounded-2xl rounded-tl-sm border bg-card text-card-foreground"
      }`}
    >
      <p className="whitespace-pre-line">{msg.text}</p>
      <span className="mt-0.5 flex items-center justify-end gap-1 self-end text-[10px] text-current opacity-60">
        {msg.time}
        {isCustomer && <Ticks status={msg.status} />}
      </span>
    </motion.div>
  );
}

// ── Tick morph (P13): ✓ → ✓✓ → blue ✓✓ ──

function Ticks({ status }: { status: TickStatus }) {
  return (
    <span className="inline-flex items-center" aria-label={`message ${status}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.1 } }}
          transition={spring.snappy}
          className="grid place-items-center"
        >
          {status === "sent" ? (
            <Check className="size-3.5" strokeWidth={2.5} />
          ) : (
            <CheckCheck
              className={`size-3.5 ${status === "read" ? "wa-tick-read" : ""}`}
              strokeWidth={2.5}
            />
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// ── Typing indicator (P12) ──

function TypingBubble() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
      transition={spring.entrance}
      className="flex items-center gap-1 self-start rounded-2xl rounded-tl-sm border bg-card px-3 py-2.5 shadow-sm"
      aria-label="Assistant is typing"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-muted-foreground/70"
          animate={reduced ? undefined : { y: [0, -3, 0], opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </motion.div>
  );
}

// ── Presence line (P12): online ⇄ typing… crossfade ──

function PresenceText({ typing }: { typing: boolean }) {
  return (
    <div className="relative h-4">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={typing ? "typing" : "online"}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={spring.snappy}
          className="wa-green absolute inset-0 text-[11px] leading-4"
        >
          {typing ? "typing…" : "online"}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
