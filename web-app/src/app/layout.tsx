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
    default: "Bragg — Predict. Compete. Bragg.",
    template: "%s | Bragg",
  },
  description:
    "The social cricket prediction game. Predict IPL match outcomes with friends and earn bragging rights.",
  keywords: ["cricket", "prediction", "IPL", "social", "game", "bragging rights"],
  authors: [{ name: "Bragg" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Bragg",
    title: "Bragg — Predict. Compete. Bragg.",
    description:
      "The social cricket prediction game. Predict IPL match outcomes with friends and earn bragging rights.",
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
