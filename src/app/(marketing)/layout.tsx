import { Navbar } from "@/components/marketing/navbar";
import { Footer } from "@/components/marketing/footer";
import { MotionShell } from "@/components/marketing/motion-shell";
import { CookieConsent } from "@/components/marketing/cookie-consent";

// Marketing shell — a server layout. Navbar/Footer/CookieConsent are the
// client islands; page children stay server-rendered by default.
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionShell>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieConsent />
      </div>
    </MotionShell>
  );
}
