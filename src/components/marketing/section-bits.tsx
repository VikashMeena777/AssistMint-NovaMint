import { cn } from "@/lib/utils";

// ─── Shared marketing section bits (server-safe: no hooks) ───

/**
 * Indexed mono eyebrow — "01 · HOW IT WORKS" ledger style.
 * The index carries the cobalt; the label stays quiet ink.
 */
export function Eyebrow({
  index,
  children,
}: {
  index: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-block font-mono text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      <span className="font-bold text-primary">{index}</span>
      <span aria-hidden="true"> · </span>
      {children}
    </span>
  );
}

/**
 * Elevation-only card hover (P7): content lifts 2px, two pre-rendered
 * shadow layers crossfade by opacity. No tint, no glow, no box-shadow tween.
 * Pure CSS — usable from both server and client components.
 */
export function ElevateCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative rounded-2xl transition-transform duration-150 ease-out hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none",
        className
      )}
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
