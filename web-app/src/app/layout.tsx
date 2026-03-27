import type { Metadata } from "next";
import { Chakra_Petch, DM_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/shared/theme-provider";
import "./globals.css";

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://bragg-lemon.vercel.app",
    siteName: "Bragg",
    title: "Bragg — Call It. Prove It. Bragg.",
    description:
      "The IPL prediction game built for bragging rights. Make your calls, compete with your crew, own the leaderboard.",
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
      className={`${chakraPetch.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-dvh bg-[var(--bg-deep)] antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
