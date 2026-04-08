import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HeroSection } from '@/components/landing/hero-section'
import { HowItWorks } from '@/components/landing/how-it-works'
import { PredictionPreview } from '@/components/landing/prediction-preview'
import { CtaSection } from '@/components/landing/cta-section'
import { GlobalFooter } from '@/components/layout/global-footer'

export const metadata: Metadata = {
  title: 'Bragg — Cricket Predictions Built for Bragging Rights',
  description:
    'The IPL prediction game for bragging rights. Rally your squad, lock in your picks across 19 scenarios per match, and own the leaderboard.',
  keywords: ['IPL', 'cricket', 'predictions', 'fantasy', 'bragging rights', 'IPL 2026'],
  openGraph: {
    title: 'Bragg — Cricket Predictions Built for Bragging Rights',
    description:
      'The IPL prediction game for bragging rights. Rally your squad, lock in your picks, and own the leaderboard.',
    type: 'website',
    siteName: 'Bragg',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Bragg — Cricket Predictions Built for Bragging Rights',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bragg — Cricket Predictions Built for Bragging Rights',
    description:
      'The IPL prediction game for bragging rights. Rally your squad, lock in your picks, and own the leaderboard.',
    images: ['/og-image.png'],
  },
}

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user !== null) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-base)]">
      <HeroSection />
      <HowItWorks />
      <PredictionPreview />
      <CtaSection />
      <GlobalFooter />
    </div>
  )
}
