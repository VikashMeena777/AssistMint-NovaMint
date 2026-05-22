import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "AssistMint Privacy Policy — How we collect, use, and protect your data. GDPR and Indian IT Act compliant.",
  openGraph: {
    title: "Privacy Policy | AssistMint",
    description: "How we collect, use, and protect your data.",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <div className="pt-32 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: April 18, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p>
              We collect information you provide when you create an account, including your name, email
              address, phone number, restaurant details, and menu information. We also collect usage
              data such as how you interact with our dashboard and WhatsApp chatbot.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Provide, maintain, and improve our services</li>
              <li>Process orders and payments on your behalf</li>
              <li>Send you technical notices and support messages</li>
              <li>Analyze usage patterns to improve our platform</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Data Sharing</h2>
            <p>
              We do not sell your personal data. We share data with third-party service providers only
              to the extent necessary to deliver our services (e.g., payment processing via Cashfree,
              WhatsApp message delivery via Meta Business API).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption in transit (TLS),
              encryption at rest, and role-based access controls. Your payment data is processed by
              PCI-compliant third-party payment processors — we never store card numbers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. You may request deletion of
              your account and associated data at any time by contacting{" "}
              <a href="mailto:privacy@assistmint.com" className="text-primary hover:underline">
                privacy@assistmint.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Cookies</h2>
            <p>
              We use cookies to maintain your session and remember your preferences. We also use
              analytics cookies with your consent to understand how our website is used. You can
              manage cookie preferences via the cookie banner.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Your Rights</h2>
            <p>
              You have the right to access, correct, delete, or export your personal data. To
              exercise these rights, email{" "}
              <a href="mailto:privacy@assistmint.com" className="text-primary hover:underline">
                privacy@assistmint.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Contact</h2>
            <p>
              If you have questions about this Privacy Policy, contact us at{" "}
              <a href="mailto:privacy@assistmint.com" className="text-primary hover:underline">
                privacy@assistmint.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
