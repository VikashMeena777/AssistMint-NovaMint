"use client";

// CommandPalette (P14) — the marketing ⌘K palette.
// Grouped results (page sections + actions), keyboard-navigable, plain dim
// overlay (no backdrop blur), spring entrance / 120ms exit. Hand-rolled:
// no new dependencies.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CircleHelp,
  Layers,
  LogIn,
  Mail,
  Play,
  IndianRupee,
  type LucideIcon,
} from "lucide-react";
import { spring } from "@/components/motion/tokens";

interface PaletteItem {
  id: string;
  label: string;
  hint: string;
  group: string;
  href: string;
  icon: LucideIcon;
}

const ITEMS: PaletteItem[] = [
  { id: "features", label: "Features", hint: "What Mint does", group: "Jump to", href: "/#features", icon: Layers },
  { id: "how-it-works", label: "How it works", hint: "Live in 10 minutes", group: "Jump to", href: "/#how-it-works", icon: Play },
  { id: "demo", label: "Live demo", hint: "Watch it answer", group: "Jump to", href: "/#demo", icon: Play },
  { id: "pricing", label: "Pricing", hint: "From ₹17 a day", group: "Jump to", href: "/#pricing", icon: IndianRupee },
  { id: "faq", label: "FAQ", hint: "Common questions", group: "Jump to", href: "/#faq", icon: CircleHelp },
  { id: "signup", label: "Start free trial", hint: "No credit card needed", group: "Actions", href: "/signup?plan=starter", icon: ArrowRight },
  { id: "login", label: "Log in", hint: "Back to your dashboard", group: "Actions", href: "/login", icon: LogIn },
  { id: "contact", label: "Talk to us", hint: "Message the founder", group: "Actions", href: "/contact", icon: Mail },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return ITEMS;
    return ITEMS.filter(
      (i) =>
        i.label.toLowerCase().includes(needle) ||
        i.group.toLowerCase().includes(needle) ||
        i.hint.toLowerCase().includes(needle)
    );
  }, [q]);

  // Reset on close; focus + reset selection on open (async boundary).
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => {
        setQ("");
        setSel(0);
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setSel(0), 0);
    return () => clearTimeout(t);
  }, [q]);

  const navigate = (href: string) => {
    onClose();
    if (href.startsWith("/#")) {
      const id = href.slice(2);
      if (pathname === "/") {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          window.history.pushState(null, "", href);
          return;
        }
      }
    }
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => (results.length ? (s + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (results.length ? (s - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[sel];
      if (item) navigate(item.href);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const flatIndexOf = (item: PaletteItem) => results.indexOf(item);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Plain dim layer — no backdrop blur (no glass) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98, transition: { duration: 0.1 } }}
            transition={spring.snappy}
            className="fixed left-1/2 top-[18vh] z-[61] w-[min(92vw,540px)] -translate-x-1/2 overflow-hidden rounded-xl border bg-card shadow-2xl"
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search or jump to… (features, pricing, demo)"
              aria-label="Search or jump to"
              className="w-full border-b bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />

            <div className="max-h-[46vh] overflow-y-auto p-2">
              {results.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Nothing matches “{q}”.
                </p>
              )}
              {["Jump to", "Actions"].map((group) => {
                const groupItems = results.filter((i) => i.group === group);
                if (groupItems.length === 0) return null;
                return (
                  <div key={group} className="mb-1">
                    <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {group}
                    </p>
                    {groupItems.map((item) => {
                      const active = flatIndexOf(item) === sel;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => setSel(flatIndexOf(item))}
                          onClick={() => navigate(item.href)}
                          className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                            active ? "bg-foreground/[0.06] text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className={active ? "font-medium text-foreground" : ""}>{item.label}</span>
                          <span className="ml-auto text-xs text-muted-foreground/70">{item.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 border-t px-4 py-2 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border bg-secondary px-1 font-mono">↑↓</kbd> move
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border bg-secondary px-1 font-mono">↵</kbd> open
              </span>
              <span className="inline-flex items-center gap-1">
                <kbd className="rounded border bg-secondary px-1 font-mono">esc</kbd> close
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
