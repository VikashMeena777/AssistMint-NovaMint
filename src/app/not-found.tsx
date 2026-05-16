"use client";

import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-4 bg-background">
      <div className="space-y-6">
        <div className="text-8xl font-black text-primary/20">404</div>
        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
          >
            <Home className="h-4 w-4" />
            Go Home
          </Link>
          <button
            onClick={() => typeof window !== "undefined" && window.history.back()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
