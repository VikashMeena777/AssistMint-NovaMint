import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers",
  description: "Join the AssistMint team — Help us build the future of restaurant automation.",
};

export default function CareersPage() {
  return (
    <div className="pt-32 pb-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Careers
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Join us in building the future of restaurant automation in India.
        </p>

        <div className="mt-10 rounded-xl border border-border bg-secondary/30 p-8 text-center">
          <h2 className="text-xl font-semibold">No open positions right now</h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
            We&apos;re a small team and don&apos;t have any open positions at the
            moment. But we&apos;re always looking for talented people.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Send your resume to{" "}
            <a
              href="mailto:careers@assistmint.com"
              className="text-primary hover:underline font-medium"
            >
              careers@assistmint.com
            </a>{" "}
            and we&apos;ll reach out when we have the right opportunity.
          </p>
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4">Why AssistMint?</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Remote-First", desc: "Work from anywhere in India." },
              { title: "Impact", desc: "Help 1M+ restaurants go digital." },
              { title: "Growth", desc: "Early-stage — shape the product." },
              { title: "Tech Stack", desc: "Modern tools, fast iteration." },
            ].map((perk) => (
              <div
                key={perk.title}
                className="rounded-xl border border-border bg-card p-5"
              >
                <h3 className="font-semibold">{perk.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{perk.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
