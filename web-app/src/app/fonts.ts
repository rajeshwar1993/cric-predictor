/**
 * Font definitions for the Electric Street design system.
 *
 * - Space Grotesk: Display / headings / data numbers
 * - DM Sans: Body / UI text
 *
 * Loaded via next/font/google for automatic self-hosting and zero layout shift.
 * CSS variables are applied on <html> and consumed by Tailwind @theme.
 *
 * @see docs/design-systems/electric-street.md — Typography section
 */

import { Space_Grotesk, DM_Sans } from 'next/font/google'

export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})
