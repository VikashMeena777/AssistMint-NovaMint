"use client";

// ─── P14 — Command palette (⌘K / Ctrl+K) ─────────────────────
// Centered overlay, plain dim layer (NO backdrop-blur), grouped
// results with the P4 neutral pill sliding between selected rows.
// Esc closes; ↑↓ navigate; ↵ routes via useRouter.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CornerDownLeft, Search, type LucideIcon } from "lucide-react";
import { spring } from "@/components/motion/tokens";

export interface CommandItem {
  id: string;
  label: string;
  /** Small right-aligned context, e.g. the rail group name */
  hint?: string;
  href: string;
  icon: LucideIcon;
}

export interface CommandGroup {
  id: string;
  label: string;
  items: CommandItem[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  groups: CommandGroup[];
}

export function CommandPalette({ open, onClose, groups }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Simple includes() fuzzy match over label, hint and group name
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) =>
            it.label.toLowerCase().includes(q) ||
            (it.hint?.toLowerCase().includes(q) ?? false) ||
            g.label.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const flat = useMemo(() => filtered.flatMap((g) => g.items), [filtered]);
  // Precomputed item-id → flat index (grouped render must not mutate during render)
  const flatIndex = useMemo(() => {
    const m = new Map<string, number>();
    flat.forEach((it, i) => m.set(it.id, i));
    return m;
  }, [flat]);

  // Reset state whenever the palette closes (async boundary)
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setQuery("");
        setSelected(0);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Keep selection in range as results change (async boundary)
  useEffect(() => {
    const t = setTimeout(() => {
      setSelected((s) => Math.min(s, Math.max(flat.length - 1, 0)));
    }, 0);
    return () => clearTimeout(t);
  }, [flat.length]);

  // Keep the selected row in view
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-cmd-index="${selected}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const run = (item: CommandItem | undefined) => {
    if (!item) return;
    onClose();
    router.push(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flat.length > 0) setSelected((s) => (s + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flat.length > 0) setSelected((s) => (s - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(flat[selected]);
    }
  };


  return (
    <AnimatePresence>
      {/* Plain dim layer — no backdrop-blur */}
      {open && (
        <motion.div
          key="cmdk-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-black/40"
        />
      )}
      {open && (
        <motion.div
          key="cmdk-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Command menu"
          initial={{ opacity: 0, y: 6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.98, transition: { duration: 0.1 } }}
          transition={spring.snappy}
          className="fixed left-1/2 top-[18vh] z-[60] w-[min(92vw,560px)] -translate-x-1/2 overflow-hidden rounded-xl border bg-card shadow-2xl"
        >
          {/* Input */}
          <div className="flex items-center gap-2.5 border-b px-4">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search or jump to… (orders, customers, campaigns)"
              aria-label="Search commands"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Esc
            </kbd>
          </div>

          {/* Grouped results */}
          <div ref={listRef} className="max-h-[min(50vh,360px)] overflow-y-auto p-2">
            {flat.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </p>
            )}
            {filtered.map((g) => (
              <div key={g.id} className="mb-1.5 last:mb-0">
                <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {g.label}
                </p>
                {g.items.map((item) => {
                  const idx = flatIndex.get(item.id) ?? 0;
                  const isSelected = idx === selected;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-cmd-index={idx}
                      onMouseEnter={() => setSelected(idx)}
                      onClick={() => run(item)}
                      className={`relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm ${
                        isSelected ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {isSelected && (
                        <motion.span
                          layoutId="cmdk-pill"
                          transition={spring.snappy}
                          className="absolute inset-0 rounded-lg bg-foreground/[0.07]"
                        />
                      )}
                      <Icon className="relative size-4 shrink-0" />
                      <span className="relative truncate font-medium">{item.label}</span>
                      {item.hint && (
                        <span className="relative ml-auto truncate pl-3 text-xs text-muted-foreground/70">
                          {item.hint}
                        </span>
                      )}
                      {isSelected && (
                        <CornerDownLeft className="relative size-3.5 shrink-0 text-muted-foreground/60" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer hints */}
          <div className="flex items-center gap-4 border-t bg-muted/40 px-4 py-2 text-[10px] text-muted-foreground">
            <span>&uarr;&darr; navigate</span>
            <span>&crarr; open</span>
            <span>esc close</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
