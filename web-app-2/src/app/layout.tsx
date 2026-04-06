import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { PostHogProvider } from '@/components/analytics/posthog-provider'
import { WebVitalsReporter } from '@/components/analytics/web-vitals-reporter'
import { PageLoadTracker } from '@/components/analytics/page-load-tracker'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
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
