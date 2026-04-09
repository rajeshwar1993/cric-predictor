import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { CURRENT_TERMS_VERSION, getMajorVersion } from '@/lib/constants'
import { AcceptTermsForm } from '@/components/auth/accept-terms-form'

export const metadata: Metadata = {
  title: 'Accept updated terms',
  description: 'Review and accept the updated Terms of Service and Privacy Policy to continue.',
}

export default async function AcceptTermsPage() {
  const supabase = await createServerClient()

  // Auth check — redirect to login if unauthenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // DB check — redirect to dashboard if user already has current terms major version
  const { data: profile } = await supabase
    .from('v2_profiles')
    .select('terms_version')
    .eq('id', user.id)
    .single()

  if (profile?.terms_version) {
    const userMajor = getMajorVersion(profile.terms_version)
    const requiredMajor = getMajorVersion(CURRENT_TERMS_VERSION)
    if (userMajor >= requiredMajor) {
      redirect('/dashboard')
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <h1 className="text-h1 mb-2 text-center text-text-primary">BRAGG</h1>

        {/* Subheading */}
        <p className="text-body mb-8 text-center text-text-secondary">
          We&apos;ve updated our terms
        </p>

        {/* Form card */}
        <div className="rounded-2xl border border-wire bg-dark-concrete p-6">
          <p className="text-body-sm mb-6 text-text-secondary">
            We&apos;ve made changes to our{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vivid-blue underline transition-colors duration-[var(--duration-state)] hover:text-text-primary"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-vivid-blue underline transition-colors duration-[var(--duration-state)] hover:text-text-primary"
            >
              Privacy Policy
            </a>
            . Please review and accept to continue.
          </p>

          <AcceptTermsForm />
        </div>
      </div>
    </div>
  )
}
