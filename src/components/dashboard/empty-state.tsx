import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// ─── Shared empty state (Bahikhata) ───────────────────────────
// One consistent "no data" treatment: a dashed ledger card, a muted
// icon, one line of copy, and a cobalt action. The action is passed as
// a ReactNode so both server pages (Link) and client pages (button)
// can use this component.

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** A <Link>, <button>, or any cobalt action element */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center ${className}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** The standard cobalt action link used inside EmptyState */
export function EmptyStateLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform duration-150 ease-out hover:-translate-y-0.5"
    >
      {children}
    </Link>
  );
}
