"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings`,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
    toast.success("Reset link sent! Check your email.");
  };

  if (sent) {
    return (
      <div className="w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          We sent a password reset link to <strong>{email}</strong>. Click the
          link in the email to reset your password.
        </p>
        <div className="pt-2 space-y-3">
          <button
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="text-sm font-medium text-primary hover:underline"
          >
            Try a different email
          </button>
          <div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Reset your password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the email associated with your account and we&apos;ll send a
          reset link.
        </p>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="reset-email"
            className="text-sm font-medium text-foreground"
          >
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@restaurant.com"
              className="flex h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Send Reset Link"
          )}
        </button>
      </form>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
