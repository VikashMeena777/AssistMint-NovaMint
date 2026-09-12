"use client";

import Link from "next/link";
import Image from "next/image";
import { useHashNav } from "@/components/marketing/use-hash-nav";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Live demo", href: "/#demo" },
      { label: "Pricing", href: "/#pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Refund Policy", href: "/refund" },
    ],
  },
];

/** Minimal ledger footer — marigold rule accent + API microcopy. */
export function Footer() {
  const handleNavClick = useHashNav();

  return (
    <footer className="border-t-2 border-seal/60 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand block */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/logo.jpg"
                alt="AssistMint Logo"
                width={28}
                height={28}
                className="h-7 w-7 rounded-md object-cover"
              />
              <span className="font-heading text-lg font-semibold tracking-tight">
                Assist<span className="text-primary">Mint</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The AI front desk for your business on WhatsApp — orders, bookings
              and payments, answered in seconds. Zero commission.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AssistMint. All rights reserved.
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            Built in India 🇮🇳
          </p>
        </div>

        {/* Microcopy — the trust line, set like a ledger footnote */}
        <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground/80">
          Made with the official WhatsApp Business API
        </p>
      </div>
    </footer>
  );
}
