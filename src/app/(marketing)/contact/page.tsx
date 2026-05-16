import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the AssistMint team for sales, support, or partnership inquiries.",
};

export default function ContactPage() {
  return (
    <div className="pt-32 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Contact Us
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Have a question or need help? We&apos;d love to hear from you.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">Sales</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Interested in AssistMint for your restaurant? Our sales team can
              walk you through a demo and help you get started.
            </p>
            <a
              href="mailto:sales@assistmint.com"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              sales@assistmint.com
            </a>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">Support</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Already a customer? Our support team is available to help you
              resolve any issues.
            </p>
            <a
              href="mailto:support@assistmint.com"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              support@assistmint.com
            </a>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">Partnerships</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Want to integrate with AssistMint or become a reseller?
              Let&apos;s talk.
            </p>
            <a
              href="mailto:partners@assistmint.com"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              partners@assistmint.com
            </a>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-semibold">General Inquiries</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              For press, careers, or anything else — drop us a line.
            </p>
            <a
              href="mailto:hello@assistmint.com"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              hello@assistmint.com
            </a>
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-border bg-secondary/30 p-6 text-center">
          <h3 className="font-semibold">Response Time</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            We typically respond within 24 hours on business days. For urgent
            support, existing customers can use the in-app chat.
          </p>
        </div>
      </div>
    </div>
  );
}
