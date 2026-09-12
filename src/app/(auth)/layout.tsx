import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Ambient background — ink canvas + mint auroras (dark) / soft mint wash (light) */}
      <div className="pointer-events-none absolute inset-0">
        {/* Light: soft mint-tinted wash */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/[0.06] dark:hidden" />
        <div className="absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[110px] dark:hidden" />
        {/* Dark: ink canvas + grid + drifting mint auroras (pure transform/opacity) */}
        <div className="absolute inset-0 hidden dark:block ink-canvas" />
        <div className="absolute inset-0 hidden dark:block ink-grid" />
        <div className="absolute -top-32 left-[12%] hidden h-[380px] w-[380px] rounded-full bg-primary/[0.07] blur-[120px] animate-[float-slow_14s_ease-in-out_infinite] dark:block" />
        <div className="absolute -bottom-28 right-[10%] hidden h-[300px] w-[300px] rounded-full bg-mint/[0.05] blur-[100px] animate-[float_11s_ease-in-out_infinite] dark:block" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Glass card */}
        <div className="glass rounded-3xl p-6 shadow-2xl shadow-black/10 dark:shadow-black/40 sm:p-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="glow-card relative h-12 w-12 overflow-hidden rounded-2xl border border-border/60 ring-1 ring-primary/25 shadow-xl shadow-primary/20">
              <Image
                src="/logo.jpg"
                alt="AssistMint Logo"
                fill
                className="object-cover"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Assist<span className="text-primary">Mint</span>
            </h1>
          </div>

          <div className="mt-6">{children}</div>
        </div>

        {/* Back to home */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
