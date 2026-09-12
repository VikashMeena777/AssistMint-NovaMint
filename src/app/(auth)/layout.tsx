import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// ─── Auth shell — Bahikhata ───────────────────────────────────
// Ivory paper, subtle dotted grain, one hairline-bordered card.
// Solid fills + hairline borders only — print, not aurora.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="paper relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* Paper card — hairline double-border: outer edge + inset ledger rule */}
        <div className="relative rounded-2xl border bg-card p-8 shadow-sm">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-2.5 rounded-xl border border-border/60"
          />
          {/* Logo + wordmark */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl border">
              <Image
                src="/logo.jpg"
                alt="AssistMint Logo"
                fill
                sizes="48px"
                className="object-cover"
                priority
              />
            </div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Assist<span className="text-primary">Mint</span>
            </h1>
            <p className="font-heading text-sm italic text-muted-foreground">
              The AI front desk on WhatsApp
            </p>
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
