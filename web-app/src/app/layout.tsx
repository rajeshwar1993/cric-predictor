import type { Metadata } from 'next'
import { spaceGrotesk, dmSans } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bragg',
  description: 'IPL prediction game — bragging rights with your crew',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable} dark`}>
      <body className="bg-concrete-black text-text-primary font-body antialiased">{children}</body>
    </html>
  )
}
