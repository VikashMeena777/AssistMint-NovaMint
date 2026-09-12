"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

// 404 — Bahikhata: ivory paper, Fraunces heading, cobalt stamp CTA.
// No glow, no gradient — print, not aurora.
export default function NotFound() {
  return (
    <div className="paper flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="max-w-md space-y-6">
        <div
          aria-hidden
          className="font-heading text-8xl font-semibold leading-none tracking-tight text-primary/20 tabular-nums"
        >
          404
        </div>
        <div className="rule-y py-5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Page not found
          </h1>
          <p className="mx-auto mt-2 text-sm leading-relaxed text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Let&apos;s get you back on track.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="stamp inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px active:translate-y-0"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
          <button
            onClick={() => typeof window !== "undefined" && window.history.back()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px active:translate-y-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
