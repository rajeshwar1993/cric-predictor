import type { Metadata, Viewport } from 'next'
import { spaceGrotesk, dmSans } from './fonts'
import { PHProvider } from '@/components/analytics/posthog-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Bragg', template: '%s | Bragg' },
  description: 'Predict right. Prove it. Bragg. A social prediction game for cricket.',
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
        <PHProvider>
          {children}
          <Toaster />
        </PHProvider>
      </body>
    </html>
  )
}
