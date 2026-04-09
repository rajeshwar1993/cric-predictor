import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { OnboardingForm } from '@/components/auth/onboarding-form'

export const metadata: Metadata = {
  title: 'Complete your profile',
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
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <h1 className="text-h1 mb-2 text-center text-text-primary">BRAGG</h1>

        {/* Subheading */}
        <p className="text-body mb-8 text-center text-text-secondary">Complete your profile</p>

        {/* Form card */}
        <div className="rounded-2xl border border-wire bg-dark-concrete p-6">
          <OnboardingForm redirectTo={redirectTo} />
        </div>

        {/* Disclaimer */}
        <p className="text-body-sm mt-6 text-center text-text-muted">
          Bragg is a free prediction game for entertainment purposes only. No real money. No
          betting. No prizes.
        </p>
      </div>
    </div>
  )
}
