import type { Metadata, Viewport } from 'next'
import { spaceGrotesk, dmSans } from './fonts'
import { PHProvider } from '@/components/analytics/posthog-provider'
import { WebVitalsReporter } from '@/components/analytics/web-vitals-reporter'
import { Toaster } from '@/components/ui/toaster'
import { env } from '@/lib/env'
import './globals.css'

const DEFAULT_OG_IMAGE = '/og-image.png'
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
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Bragg — Predict Right. Prove It.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bragg — Predict Right. Prove It.',
    description: DEFAULT_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
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
          <WebVitalsReporter />
          {children}
          <Toaster />
        </PHProvider>
      </body>
    </html>
  )
}
