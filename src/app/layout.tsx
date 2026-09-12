import type { Metadata } from "next";
import { Instrument_Sans, Fraunces, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/lib/analytics/posthog-provider";
import FacebookSDK from "@/components/facebook-sdk";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  preload: true,
  // Variable font: weights 300–900 come from the font itself (500–600 used
  // by the Bahikhata design). `axes` requires no explicit weight.
  axes: ["opsz"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AssistMint — The AI front desk for your business on WhatsApp",
    template: "%s | AssistMint",
  },
  description:
    "AssistMint replies to every customer on WhatsApp in seconds — 24×7 — on your official business number. Orders, bookings, payments. Live in 10 minutes.",
  keywords: [
    "whatsapp business automation",
    "whatsapp ai assistant",
    "whatsapp chatbot india",
    "ai ordering whatsapp",
    "appointment booking whatsapp",
    "local business automation",
  ],
  authors: [{ name: "AssistMint" }],
  openGraph: {
    title: "AssistMint — The AI front desk on WhatsApp",
    description: "Every customer message answered in seconds, 24×7. Live in 10 minutes.",
    type: "website",
    locale: "en_IN",
    siteName: "AssistMint",
  },
  twitter: {
    card: "summary_large_image",
    title: "AssistMint — The AI front desk on WhatsApp",
    description: "Every customer message answered in seconds, 24×7. Live in 10 minutes.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <PostHogProvider>
            {children}
          </PostHogProvider>
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: "var(--radius-lg)",
              },
            }}
          />
        </ThemeProvider>
        <FacebookSDK />
      </body>
    </html>
  );
}
