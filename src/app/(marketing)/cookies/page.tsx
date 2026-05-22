import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "AssistMint Cookie Policy — How and why we use cookies on our platform.",
  robots: { index: false, follow: true },
};

export default function CookiesPage() {
  return (
    <div className="pt-32 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Cookie Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: April 18, 2026
        </p>

        <div className="mt-10 space-y-8 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">What Are Cookies</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website. They help
              us provide a better experience by remembering your preferences and session information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Cookies We Use</h2>
            <div className="mt-3 rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-foreground">Cookie</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Purpose</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-3">Session cookie</td>
                    <td className="px-4 py-3">Maintains your login session</td>
                    <td className="px-4 py-3">Session</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">cookie_consent</td>
                    <td className="px-4 py-3">Remembers your cookie preference</td>
                    <td className="px-4 py-3">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Theme preference</td>
                    <td className="px-4 py-3">Stores light/dark mode preference</td>
                    <td className="px-4 py-3">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Managing Cookies</h2>
            <p>
              You can manage or delete cookies through your browser settings. Please note that
              disabling cookies may affect the functionality of our platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Contact</h2>
            <p>
              If you have questions about our cookie practices, email{" "}
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
