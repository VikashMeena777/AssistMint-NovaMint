"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

// Error boundary — Bahikhata: ledger rules, Fraunces heading, cobalt stamp
// CTA. No glow — print, not aurora.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Error Boundary]", error);
  }, [error]);

  return (
    <div className="paper flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
          <AlertCircle className="h-9 w-9 text-destructive" />
        </div>
        <div className="rule-y py-5">
          <h2 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Something went wrong
          </h2>
          <p className="mx-auto mt-2 text-sm leading-relaxed text-muted-foreground">
            An unexpected error occurred. Our team has been notified. Please try
            again or contact support if the issue persists.
          </p>
        </div>
        <button
          onClick={reset}
          className="stamp inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px active:translate-y-0"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
