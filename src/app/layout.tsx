import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/lib/analytics/posthog-provider";
import FacebookSDK from "@/components/facebook-sdk";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AssistMint — AI WhatsApp Assistant for Local Business",
    template: "%s | AssistMint",
  },
  description:
    "Put your business on WhatsApp with an AI assistant that takes orders, books appointments, collects payments and runs loyalty — 24/7, zero commission.",
  keywords: [
    "whatsapp business automation",
    "whatsapp chatbot",
    "ai ordering",
    "appointment booking whatsapp",
    "restaurant saas india",
    "local business automation",
  ],
  authors: [{ name: "AssistMint" }],
  openGraph: {
    title: "AssistMint — AI WhatsApp Assistant for Local Business",
    description: "Orders, bookings, payments and loyalty on WhatsApp — on autopilot.",
    type: "website",
    locale: "en_IN",
    siteName: "AssistMint",
  },
  twitter: {
    card: "summary_large_image",
    title: "AssistMint — AI WhatsApp Assistant",
    description: "Orders, bookings, payments and loyalty on WhatsApp — on autopilot.",
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
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
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
