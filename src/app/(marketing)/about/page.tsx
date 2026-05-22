import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about AssistMint — the AI-powered WhatsApp ordering platform for restaurants in India.",
  openGraph: {
    title: "About AssistMint — AI Restaurant Automation",
    description: "Learn how AssistMint is transforming restaurant ordering in India with AI-powered WhatsApp chatbots.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "About AssistMint",
    description: "Learn how AssistMint is transforming restaurant ordering in India.",
  },
};

export default function AboutPage() {
  return (
    <div className="pt-32 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          About AssistMint
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          We&apos;re building the future of restaurant automation in India.
        </p>

        <div className="mt-10 prose prose-zinc max-w-none">
          <h2 className="text-xl font-semibold mt-8 mb-3">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            AssistMint was born from a simple observation: restaurants in India
            lose thousands of orders every month because they can&apos;t answer
            calls during rush hours, don&apos;t have an online ordering system,
            or simply lack the tech infrastructure to compete in the digital
            age.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-4">
            We believe every restaurant — from a small dhaba to a multi-branch
            chain — deserves access to enterprise-grade AI automation without
            the enterprise price tag.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">What We Do</h2>
          <p className="text-muted-foreground leading-relaxed">
            AssistMint provides an AI-powered WhatsApp chatbot that handles
            everything from menu browsing and order-taking to payment
            collection and customer loyalty — all through the app your
            customers already use every day: WhatsApp.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">Why WhatsApp?</h2>
          <p className="text-muted-foreground leading-relaxed">
            With over 500 million users in India, WhatsApp is the most natural
            platform for restaurant ordering. No app downloads, no complex
            sign-ups — customers simply message your restaurant and start
            ordering instantly.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">Our Team</h2>
          <p className="text-muted-foreground leading-relaxed">
            We&apos;re a small, passionate team of engineers and designers based
            in India. We combine deep expertise in AI, cloud infrastructure,
            and the Indian restaurant industry to build software that actually
            works for Indian businesses.
          </p>

          <h2 className="text-xl font-semibold mt-8 mb-3">Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            Have questions? Reach out at{" "}
            <a
              href="mailto:hello@assistmint.com"
              className="text-primary hover:underline"
            >
              hello@assistmint.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
