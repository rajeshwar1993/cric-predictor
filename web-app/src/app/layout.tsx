import type { Metadata } from "next";
import { Sora, Outfit, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { PostHogProvider } from "@/components/shared/posthog-provider";
import "@/lib/env"; // Validate env vars at startup — fail fast if missing
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`${sora.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
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
