import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { getProfileStats } from '@/lib/dal/profile'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { ProfileInfo } from '@/components/profile/profile-info'
import { ProfileStats } from '@/components/profile/profile-stats'

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Your Bragg profile, stats, and account settings.',
}

/**
 * Profile page — `/profile`.
 *
 * Auth gate: unauthenticated users redirect to /login.
 *
 * Sections (in order):
 *   1. Account Info — avatar, editable display name, read-only fields
 *   2. Stats Overview — aggregated stats across every gang
 *   3. Account Actions — link to delete account flow (PRF-002)
 *
 * @see docs/stories/PRF-001-profile-page.md
 */
export default async function ProfilePage() {
  const supabase = await createServerClient()

  // Auth gate
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile + aggregated stats in parallel
  const [profileResult, stats] = await Promise.all([
    supabase
      .from('v2_profiles')
      .select('display_name, date_of_birth, created_at')
      .eq('id', user.id)
      .single(),
    getProfileStats(user.id),
  ])

  if (profileResult.error || !profileResult.data) {
    // The middleware/onboarding flow guarantees a profile row exists for any
    // authenticated user, so this branch is defensive — if we ever land here
    // the safest thing is to bounce them through onboarding.
    redirect('/onboarding')
  }

  const profile = profileResult.data
  const displayName = profile.display_name ?? ''
  const email = user.email ?? ''

  return (
    <PageWrapper className="py-8">
      {/* Page title */}
      <h1 className="text-h1 text-text-primary">PROFILE</h1>

      {/* 1. Account info */}
      <ProfileInfo
        displayName={displayName}
        email={email}
        dateOfBirth={profile.date_of_birth}
        joinedAt={profile.created_at}
      />

      {/* 2. Stats overview */}
      <ProfileStats stats={stats} />

      {/* 3. Account actions */}
      <section
        className="mt-8 rounded-lg border border-wire bg-dark-concrete p-6"
        aria-labelledby="profile-account-actions-heading"
      >
        <h2
          id="profile-account-actions-heading"
          className="text-h3 font-bold uppercase tracking-[0.02em] text-text-primary"
        >
          Account Actions
        </h2>
        <Link
          href="/profile/delete"
          className="mt-4 -mx-2 flex items-center justify-between rounded-md px-2 py-3 text-body text-electric-coral transition-colors duration-[150ms] hover:bg-electric-coral/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-bragg-lime/50"
        >
          <span>Delete Account</span>
          <ChevronRight className="size-5" aria-hidden="true" />
        </Link>
      </section>
    </PageWrapper>
  )
}
