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
  title: 'Bragg — IPL Prediction Game',
  description: 'Social prediction game for IPL 2026',
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
