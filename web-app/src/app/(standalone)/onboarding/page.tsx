import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { OnboardingForm } from '@/components/auth/onboarding-form'
import { BraggWordmark } from '@/components/ui/bragg-wordmark'
import { LEGAL_DISCLAIMER } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Claim your spot',
  description: 'Set up your Bragg profile to start making predictions.',
}

interface OnboardingPageProps {
  searchParams: Promise<{ redirectTo?: string }>
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = await createServerClient()

  // Auth check — redirect to login if unauthenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // DB check — redirect to dashboard if already onboarded
  const { data: profile } = await supabase
    .from('v2_profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed) {
    redirect('/dashboard')
  }

  const { redirectTo } = await searchParams

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 pb-[max(48px,env(safe-area-inset-bottom))] pt-12">
      <div className="w-full max-w-[480px]">
        {/* Logo */}
        <BraggWordmark as="h1" tone="primary" className="mb-2 text-center text-[44px]" />

        {/* Subheading */}
        <p className="text-body-lg mb-10 text-center uppercase tracking-[0.08em] text-text-secondary">
          Claim your spot
        </p>

        {/* Card with lime accent stripe */}
        <div className="motion-safe:animate-pop-in">
          {/* Lime accent stripe — sharp corners contrast the rounded card */}
          <div aria-hidden="true" className="h-1 bg-bragg-lime" />

          {/* Form card */}
          <div className="rounded-b-2xl border border-t-0 border-wire bg-dark-concrete p-6 shadow-elevation-1">
            <OnboardingForm redirectTo={redirectTo} />
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-body-sm mt-6 text-center text-text-muted">{LEGAL_DISCLAIMER}</p>
      </div>
    </div>
  )
}
