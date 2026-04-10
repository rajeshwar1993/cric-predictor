import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { DeleteAccountSection } from '@/components/profile/delete-account-section'

export const metadata: Metadata = {
  title: 'Delete Account',
  description: 'Permanently delete your Bragg account.',
}

/**
 * Delete Account page — `/profile/delete`.
 *
 * Auth gate: unauthenticated users redirect to /login.
 *
 * Server component shell that fetches the user's email (the value the
 * confirmation dialog requires the user to type) and renders the warning
 * text plus the client-side `DeleteAccountSection` for the destructive
 * confirm flow.
 *
 * @see docs/stories/PRF-002-delete-account.md
 */
export default async function DeleteAccountPage() {
  const supabase = await createServerClient()

  // Auth gate
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // The auth user always has an email — guard defensively in case Supabase
  // ever returns one without (e.g. test env). Without an email we cannot
  // run the typed-confirmation flow, so bounce back to the profile page.
  const email = user.email
  if (!email) {
    redirect('/profile')
  }

  return (
    <PageWrapper className="py-8">
      {/* Back link to /profile */}
      <Link
        href="/profile"
        className="-ml-2 inline-flex items-center gap-1 rounded px-2 py-1 text-body-sm text-text-secondary transition-colors duration-[150ms] hover:bg-light-concrete hover:text-text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to profile
      </Link>

      {/* Page title */}
      <h1 className="mt-4 text-h1 text-text-primary">DELETE ACCOUNT</h1>

      {/* Consequences — full warning text from acceptance criteria */}
      <section
        className="mt-8 rounded-lg border border-wire bg-dark-concrete p-6"
        aria-labelledby="delete-account-consequences-heading"
      >
        <h2
          id="delete-account-consequences-heading"
          className="text-h3 font-bold uppercase tracking-[0.02em] text-text-primary"
        >
          What happens next
        </h2>
        <ul className="mt-4 flex flex-col gap-3 text-body text-text-secondary">
          <li className="flex gap-3">
            <span
              className="mt-2 size-1.5 shrink-0 rounded-full bg-electric-coral"
              aria-hidden="true"
            />
            <span>This will permanently delete your account</span>
          </li>
          <li className="flex gap-3">
            <span
              className="mt-2 size-1.5 shrink-0 rounded-full bg-electric-coral"
              aria-hidden="true"
            />
            <span>
              Your predictions will be preserved in gangs for other members
            </span>
          </li>
          <li className="flex gap-3">
            <span
              className="mt-2 size-1.5 shrink-0 rounded-full bg-electric-coral"
              aria-hidden="true"
            />
            <span>
              If you are the admin of a gang, another member will be promoted.
              If no other members exist, the gang will be deleted.
            </span>
          </li>
          <li className="flex gap-3">
            <span
              className="mt-2 size-1.5 shrink-0 rounded-full bg-electric-coral"
              aria-hidden="true"
            />
            <span>
              You can sign in again later with the same email to restore your
              account.
            </span>
          </li>
        </ul>
      </section>

      {/* Destructive confirm flow */}
      <DeleteAccountSection email={email} />
    </PageWrapper>
  )
}
