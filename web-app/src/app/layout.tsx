import type { Metadata } from "next";
import { Space_Grotesk, Manrope, Lexend } from "next/font/google";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { PostHogProvider } from "@/components/shared/posthog-provider";
import "@/lib/env"; // Validate env vars at startup — fail fast if missing
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "Bragg — Call It. Prove It. Bragg.",
    template: "%s | Bragg",
  },
  description:
    "The IPL prediction game built for bragging rights. Make your calls, compete with your crew, own the leaderboard.",
  keywords: ["cricket", "prediction", "IPL", "IPL 2026", "social", "game", "bragging rights", "leaderboard", "compete"],
  authors: [{ name: "Bragg" }],
  metadataBase: new URL("https://bragg-lemon.vercel.app"),
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://bragg-lemon.vercel.app",
    siteName: "Bragg",
    title: "Bragg — Call It. Prove It. Bragg.",
    description:
      "The IPL prediction game built for bragging rights. Make your calls, compete with your crew, own the leaderboard.",
    images: [
      {
        url: "/og-image.png",
        width: 512,
        height: 512,
        alt: "Bragg logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Bragg — Call It. Prove It. Bragg.",
    description: "The IPL prediction game built for bragging rights.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
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
      className={`${spaceGrotesk.variable} ${manrope.variable} ${lexend.variable}`}
    >
      <body className="min-h-dvh bg-[var(--bg-deep)] antialiased">
        <ThemeProvider>
          <Suspense fallback={null}>
            <PostHogProvider>{children}</PostHogProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
