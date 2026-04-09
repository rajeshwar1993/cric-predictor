import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getUserGangs } from '@/lib/dal/gangs'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { GangsGrid } from '@/components/gangs/gangs-grid'
import { PendingInviteBanner } from '@/components/gangs/pending-invite-banner'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your gangs and predictions hub.',
}

/**
 * Dashboard page — the main authenticated hub.
 *
 * Fetches the current user's approved gang memberships and renders
 * them in a grid. New users see an empty state prompting them to
 * create or join a gang.
 *
 * The PendingInviteBanner appears at the top when the user has
 * arrived via an invite link (data stored in localStorage).
 *
 * @see docs/stories/DASH-001-dashboard-page.md
 * @see docs/stories/DASH-003-join-gang.md
 */
export default async function DashboardPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const gangs = await getUserGangs(user.id)

  return (
    <PageWrapper className="py-8">
      <PendingInviteBanner />
      <h1 className="text-h1 mb-6 text-text-primary">Your Gangs</h1>
      <GangsGrid gangs={gangs} />
    </PageWrapper>
  )
}
