import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { HeroSection } from '@/components/landing/hero-section'
import { HowItWorks } from '@/components/landing/how-it-works'
import { PredictionPreview } from '@/components/landing/prediction-preview'
import { CtaSection } from '@/components/landing/cta-section'
import { Footer } from '@/components/layout/footer'

export const metadata: Metadata = {
  title: 'Bragg — Predict Right. Prove It. Bragg.',
  description:
    'The prediction game that settles debates in your group chat. Form a gang, pick winners, and bragg your way to #1.',
}

/**
 * Landing page — public marketing route at `/`.
 *
 * Thin server shell that:
 *   1. Redirects authenticated users to `/dashboard` (cookie-based
 *      auth check → `force-dynamic`).
 *   2. Composes the four landing section components plus the
 *      global footer inside a min-h-dvh flex column so the footer
 *      sticks to the bottom on tall viewports.
 *
 * @see docs/stories/PUB-001-landing-page.md
 */
export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-concrete-black">
      <main className="flex-1">
        <HeroSection />
        <HowItWorks />
        <PredictionPreview />
        <CtaSection />
      </main>
      <Footer />
    </div>
  )
}
