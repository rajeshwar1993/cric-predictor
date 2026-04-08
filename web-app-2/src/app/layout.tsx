import type { Metadata } from 'next'
import { Space_Grotesk, Inter } from 'next/font/google'
import { PostHogProvider } from '@/components/analytics/posthog-provider'
import { WebVitalsReporter } from '@/components/analytics/web-vitals-reporter'
import { PageLoadTracker } from '@/components/analytics/page-load-tracker'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
})

const inter = Inter({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3001'),
  title: {
    default: 'Bragg — IPL Prediction Game',
    template: '%s | Bragg',
  },
  description:
    'The IPL prediction game for bragging rights. Rally your squad, lock in your picks across 19 scenarios per match, and own the leaderboard.',
  keywords: ['IPL', 'cricket', 'predictions', 'fantasy', 'bragging rights', 'IPL 2026'],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Bragg',
    title: 'Bragg — Cricket Predictions Built for Bragging Rights',
    description:
      'The IPL prediction game for bragging rights. Rally your squad, lock in your picks, and own the leaderboard.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Bragg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bragg — Cricket Predictions Built for Bragging Rights',
    description:
      'The IPL prediction game for bragging rights. Rally your squad, lock in your picks, and own the leaderboard.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <PostHogProvider>
          {children}
          <WebVitalsReporter />
          <PageLoadTracker />
        </PostHogProvider>
      </body>
    </html>
  )
}
