import {
  SectionReveal,
  StaggerContainer,
  StaggerItem as CardStaggerItem,
} from "@/components/marketing/animated-primitives";
import { Eyebrow } from "@/components/marketing/section-bits";
import { FAQAccordion } from "@/components/marketing/faq-accordion";

// ═══════════════════════════════════════════════
// 11 — FAQ — server shell; each accordion is a
//      tiny client island (state lives per item).
// ═══════════════════════════════════════════════

const FAQS = [
  {
    q: "How long does it take to fully set up?",
    a: "Under 10 minutes. You sign up, add your categories and menu items, connect your Meta WhatsApp Business API securely via our guided layout, and your AI assistant is instantly active.",
  },
  {
    q: "Do I need a WhatsApp Business API account?",
    a: "Yes, meta requirements mandate using the official WhatsApp Business API to run high-volume automated chatbots. Our AssistMint portal guides you through secure self-serve integration in minutes.",
  },
  {
    q: "What Indian languages does the AI support?",
    a: "The conversational bot currently processes queries and orders in 6 regional languages, including English, Hindi (हिन्दी), Tamil (தமிழ்), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), and Marathi (मराठी).",
  },
  {
    q: "How are payment transactions handled?",
    a: "AssistMint integrates directly with Cashfree Payments. When a customer orders, the AI serves a secure UPI/Card checkout link right inside the chat window, confirming payment in real-time.",
  },
  {
    q: "Is there a transaction or commission fee per order?",
    a: "No commission fees whatsoever! We charge a transparent, flat monthly/yearly subscription based on your plan features. All revenues go straight to your merchant bank account.",
  },
  {
    q: "What happens if the AI fails to parse a message?",
    a: "No problem. If the AI encounters a customer question it can't resolve, it triggers a seamless Human Handoff. The conversation appears in real-time on your dashboard, notifying your support staff.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mb-12 text-center">
            <Eyebrow index="07">Questions</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              Frequently asked questions.
            </h2>
          </div>
        </SectionReveal>

        <StaggerContainer className="space-y-3" staggerDelay={0.05}>
          {FAQS.map((faq) => (
            <CardStaggerItem key={faq.q}>
              <FAQAccordion question={faq.q} answer={faq.a} />
            </CardStaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
