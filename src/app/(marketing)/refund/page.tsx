import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "AssistMint Refund Policy — Our refund and cancellation guidelines for subscription plans.",
  openGraph: {
    title: "Refund Policy | AssistMint",
    description: "Our refund and cancellation guidelines for subscription plans.",
    type: "website",
  },
};

export default function RefundPage() {
  return (
    <div className="pt-32 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Refund Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: April 18, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Free Trial</h2>
            <p>
              Our Starter Plan includes a 14-day free trial. No credit card is required to start your trial.
              If you do not upgrade to a paid plan, your account will be automatically downgraded at
              the end of the trial period.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Cancellation</h2>
            <p>
              You may cancel your subscription at any time from your dashboard settings. Upon
              cancellation, you will continue to have access to your plan features until the end of
              your current billing period.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Refunds</h2>
            <p>
              We offer a full refund if you cancel within 7 days of your first paid subscription.
              After the 7-day window, subscription fees are non-refundable. Partial-month refunds
              are not available.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Downgrade</h2>
            <p>
              You may downgrade your plan at any time. The downgrade will take effect at the start
              of your next billing period. No prorated refunds are provided for downgrades.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Contact</h2>
            <p>
              For refund requests or billing questions, contact us at{" "}
              <a href="mailto:billing@assistmint.com" className="text-primary hover:underline">
                billing@assistmint.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
