"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

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
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 mb-6">
        <AlertCircle className="h-9 w-9 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        An unexpected error occurred. Our team has been notified. Please try
        again or contact support if the issue persists.
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
      >
        <RefreshCw className="h-4 w-4" />
        Try Again
      </button>
    </div>
  );
}
