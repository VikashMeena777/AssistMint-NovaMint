import type { LucideIcon } from "lucide-react";

// ─── Shared status pill (Bahikhata) ───────────────────────────
// One shape everywhere: rounded-full hairline border, 11px medium,
// token colors that flip correctly in light + dark, tabular numerals.
// NOTE: never raw palette colors (amber-400 etc. break the light theme).

export type StatusTone =
  | "success"
  | "warning"
  | "destructive"
  | "muted"
  | "primary";

const TONE_CLASSES: Record<StatusTone, string> = {
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  destructive: "border-destructive/25 bg-destructive/10 text-destructive",
  muted: "border-border bg-muted text-muted-foreground",
  primary: "border-primary/25 bg-primary/10 text-primary",
};

interface StatusPillProps {
  tone: StatusTone;
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function StatusPill({
  tone,
  children,
  icon: Icon,
  className = "",
}: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums ${TONE_CLASSES[tone]} ${className}`}
    >
      {Icon ? <Icon className="h-3 w-3 shrink-0" /> : null}
      {children}
    </span>
  );
}

// ─── Common domain mappings ───────────────────────────────────

/** Order lifecycle → tone */
export function orderStatusTone(status: string): StatusTone {
  switch (status) {
    case "delivered":
    case "ready":
    case "confirmed":
      return "success";
    case "out_for_delivery":
    case "preparing":
      return "primary";
    case "pending":
      return "warning";
    case "cancelled":
      return "destructive";
    default:
      return "muted";
  }
}

/** Payment status → tone */
export function paymentStatusTone(status: string): StatusTone {
  switch (status) {
    case "paid":
    case "completed":
      return "success";
    case "cod_pending":
    case "pending":
      return "warning";
    case "failed":
      return "destructive";
    case "refunded":
      return "primary";
    default:
      return "muted";
  }
}
