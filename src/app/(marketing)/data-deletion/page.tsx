import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail, Trash2, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Data Deletion",
  description: "How to request deletion of your data from AssistMint.",
  robots: { index: false, follow: false },
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to AssistMint
        </Link>

        <div className="mt-8 border-b border-border pb-6">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Data Deletion
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            How to delete your data from AssistMint and any data we hold via the
            WhatsApp Business Platform.
          </p>
        </div>

        <section className="mt-8 space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-secondary">
                <Trash2 className="size-4 text-foreground" />
              </span>
              <h2 className="font-heading text-lg font-semibold">Option 1 — In the dashboard</h2>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              Business owners can delete their account and business data from{" "}
              <span className="font-medium text-foreground">Dashboard → Settings → Account</span>.
              Deleting your business removes your menu, customers, orders,
              conversations, and payment records. Account deletion removes your
              login and all businesses you own.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-secondary">
                <Mail className="size-4 text-foreground" />
              </span>
              <h2 className="font-heading text-lg font-semibold">Option 2 — By email</h2>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              Send a deletion request from your registered email to{" "}
              <a
                href="mailto:support@assistmint.novamintnetworks.in?subject=Data%20Deletion%20Request"
                className="font-medium text-primary underline underline-offset-2"
              >
                support@assistmint.novamintnetworks.in
              </a>{" "}
              with the subject &ldquo;Data Deletion Request&rdquo;. We process requests
              within 7 working days and confirm by reply.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-secondary">
                <Shield className="size-4 text-foreground" />
              </span>
              <h2 className="font-heading text-lg font-semibold">Via Meta</h2>
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              You can also request deletion through Meta (Facebook → Settings →
              Apps and Websites → AssistMint → Remove). Meta forwards the request
              to our data-deletion callback, and we confirm within the same
              7-working-day window.
            </p>
            <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
              Note: AssistMint accounts use email or Google sign-in — we do not
              receive your Facebook profile data. WhatsApp conversation data
              belongs to the business you messaged and is deleted when that
              business deletes it.
            </p>
          </div>
        </section>

        <p className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
          Confirmation code: assistmint-data-deletion · See our{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </Link>{" "}
          for the full data handling details.
        </p>
      </div>
    </main>
  );
}
