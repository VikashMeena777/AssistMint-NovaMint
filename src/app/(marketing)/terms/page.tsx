import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "AssistMint Terms of Service — Rules and guidelines for using our platform.",
};

export default function TermsPage() {
  return (
    <div className="pt-32 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: April 18, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using AssistMint, you agree to be bound by these Terms of Service. If
              you do not agree to these terms, you may not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Services</h2>
            <p>
              AssistMint provides an AI-powered WhatsApp chatbot platform for restaurants, including
              automated ordering, payment collection, customer management, analytics, and marketing
              campaign tools.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Account Registration</h2>
            <p>
              You must provide accurate and complete information when creating an account. You are
              responsible for maintaining the security of your account credentials and for all
              activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Subscription & Payment</h2>
            <p>
              AssistMint offers subscription plans billed monthly. You agree to pay the fees
              associated with your chosen plan. We may change pricing with 30 days&apos; notice.
              All fees are non-refundable except as required by law or as stated in our Refund
              Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Use the service for any unlawful purpose</li>
              <li>Send spam or unsolicited messages to customers</li>
              <li>Attempt to reverse-engineer or copy the platform</li>
              <li>Share your account credentials with unauthorized third parties</li>
              <li>Use the AI chatbot for purposes other than restaurant operations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Intellectual Property</h2>
            <p>
              AssistMint and its original content, features, and functionality are owned by
              AssistMint and are protected by international copyright, trademark, and other
              intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, AssistMint shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages arising from your
              use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Termination</h2>
            <p>
              We may terminate or suspend your account at any time for violation of these terms. You
              may cancel your subscription at any time through your dashboard settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Governing Law</h2>
            <p>
              These terms shall be governed by and construed in accordance with the laws of India.
              Any disputes shall be subject to the exclusive jurisdiction of the courts in Jaipur,
              Rajasthan.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Contact</h2>
            <p>
              For questions about these Terms, contact us at{" "}
              <a href="mailto:legal@assistmint.com" className="text-primary hover:underline">
                legal@assistmint.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
