import type { Metadata, Viewport } from 'next'
import { spaceGrotesk, dmSans } from './fonts'
import { Suspense } from 'react'
import { PHProvider } from '@/components/analytics/posthog-provider'
import { WebVitalsReporter } from '@/components/analytics/web-vitals-reporter'
import { NavigationProgress } from '@/components/layout/navigation-progress'
import { Toaster } from '@/components/ui/toaster'
import { env } from '@/lib/env'
import './globals.css'

const DEFAULT_DESCRIPTION =
  'Predict right. Prove it. Bragg. A social prediction game for cricket.'

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: { default: 'Bragg', template: '%s | Bragg' },
  description: DEFAULT_DESCRIPTION,
  applicationName: 'Bragg',
  openGraph: {
    type: 'website',
    siteName: 'Bragg',
    locale: 'en_US',
    title: 'Bragg — Predict Right. Prove It.',
    description: DEFAULT_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bragg — Predict Right. Prove It.',
    description: DEFAULT_DESCRIPTION,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable} dark`}>
      <body className="bg-concrete-black text-text-primary font-body antialiased min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-bragg-lime focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:uppercase focus:tracking-[0.08em] focus:text-text-on-primary focus:shadow-elevation-2 focus:outline-none"
        >
          Skip to content
        </a>
        <PHProvider>
          <Suspense fallback={null}>
            <NavigationProgress />
          </Suspense>
          <WebVitalsReporter />
          {children}
          <Toaster />
        </PHProvider>
      </body>
    </html>
  )
}
