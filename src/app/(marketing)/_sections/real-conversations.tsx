import {
  SectionReveal,
  StaggerContainer,
  StaggerItem as CardStaggerItem,
} from "@/components/marketing/animated-primitives";
import { Eyebrow, ElevateCard } from "@/components/marketing/section-bits";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════
// 6 — REAL CONVERSATIONS GALLERY (masked transcripts)
//     Server component.
// ═══════════════════════════════════════════════

const CHATS = [
  {
    tag: "Restaurant",
    time: "11:04 PM · TUE",
    lines: [
      { mint: false, sender: "•• 207", text: "Bhai late night option hai kya?" },
      { mint: true, sender: "Mint", text: "Haan ji! Kitchen is open till 12. Reply “1” to see the menu and order." },
      { mint: false, sender: "•• 207", text: "1 butter chicken + 4 rumali" },
      { mint: true, sender: "Mint", text: "Order #1214 · ₹529 · UPI link sent ✓" },
    ],
  },
  {
    tag: "Salon",
    time: "9:12 AM · SUN",
    lines: [
      { mint: false, sender: "•• 883", text: "Sunday koi slot hai haircut ka?" },
      { mint: true, sender: "Mint", text: "11:00 am and 4:30 pm are open. Which one?" },
      { mint: false, sender: "•• 883", text: "11 waala" },
      { mint: true, sender: "Mint", text: "Booked ✓ Sunday 11:00 am with Ravi. Reminder goes out Saturday." },
    ],
  },
  {
    tag: "Clinic",
    time: "6:41 PM · WED",
    lines: [
      { mint: false, sender: "•• 551", text: "Dr. Mehta available tomorrow?" },
      { mint: true, sender: "Mint", text: "Yes — token 14 at 10:20 am. Shall I book it?" },
      { mint: false, sender: "•• 551", text: "yes please" },
      { mint: true, sender: "Mint", text: "Token 14 confirmed ✓ Visit ₹400 · report by 2 pm" },
    ],
  },
  {
    tag: "Home services",
    time: "1:23 PM · SAT",
    lines: [
      { mint: false, sender: "•• 190", text: "AC repair — visit charge kitna?" },
      { mint: true, sender: "Mint", text: "Visit + check ₹449 — free if you get the repair done. Tomorrow 11 am?" },
      { mint: false, sender: "•• 190", text: "book 11" },
      { mint: true, sender: "Mint", text: "Done ✓ Technician Rahul, 11:00–11:30 am" },
    ],
  },
];

export function RealConversationsSection() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionReveal>
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <Eyebrow index="04">Proof</Eyebrow>
            <h2 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Real chats. Numbers masked. Nothing staged.
            </h2>
          </div>
        </SectionReveal>

        <StaggerContainer className="grid gap-5 md:grid-cols-2" staggerDelay={0.07}>
          {CHATS.map((chat) => (
            <CardStaggerItem key={chat.tag}>
              <ElevateCard className="h-full">
                <div className="h-full rounded-2xl border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="font-mono text-[11px] font-medium tracking-wide text-muted-foreground">
                      {chat.time}
                    </span>
                    <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {chat.tag}
                    </span>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {chat.lines.map((line, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span
                          className={cn(
                            "w-14 shrink-0 pt-px font-mono text-[11px] font-semibold",
                            line.mint ? "text-primary" : "text-muted-foreground/70"
                          )}
                        >
                          {line.sender}
                        </span>
                        <span className="text-sm leading-relaxed text-foreground">{line.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </ElevateCard>
            </CardStaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
