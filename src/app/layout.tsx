import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { PostHogProvider } from "@/lib/analytics/posthog-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AssistMint — AI-Powered WhatsApp Ordering for Restaurants",
    template: "%s | AssistMint",
  },
  description:
    "Transform your restaurant with AI-powered WhatsApp chatbot. Automated ordering, payments, and customer engagement — 24/7.",
  keywords: [
    "restaurant automation",
    "whatsapp chatbot",
    "ai ordering",
    "food ordering",
    "restaurant saas",
  ],
  authors: [{ name: "AssistMint" }],
  openGraph: {
    title: "AssistMint — AI-Powered WhatsApp Ordering",
    description: "Transform your restaurant with AI-powered WhatsApp chatbot.",
    type: "website",
    locale: "en_IN",
    siteName: "AssistMint",
  },
  twitter: {
    card: "summary_large_image",
    title: "AssistMint — AI-Powered WhatsApp Ordering",
    description: "Transform your restaurant with AI-powered WhatsApp chatbot.",
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
      className={`${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} h-full`}
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
      </body>
    </html>
  );
}
