import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Logo } from '@/components/ui/logo'
import { OnboardingForm } from '@/components/auth/onboarding-form'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    redirect('/login')
  }

  // Check if already onboarded
  const { data: profile } = await supabase
    .from('v2_profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed === true) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-[var(--sp-5)]">
      <div className="w-full max-w-[400px] space-y-8">
        <div className="space-y-3 text-center">
          <Logo size="md" />
          <h1 className="font-heading text-2xl font-semibold text-[var(--text-primary)]">
            One last step before you&apos;re in
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Set up your profile and you&apos;re good to go.
          </p>
        </div>

        <OnboardingForm />

        <p className="text-center text-xs text-[var(--text-tertiary)]">
          Bragg is a free prediction game — no real money, no gambling.
        </p>
      </div>
    </div>
  )
}
