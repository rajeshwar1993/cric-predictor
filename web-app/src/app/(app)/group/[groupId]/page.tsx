import { cache } from 'react'
import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getGangDetails } from '@/lib/dal/gangs'
import { env } from '@/lib/env'
import { PageWrapper } from '@/components/layout/page-wrapper'
import { GangHeader } from '@/components/gangs/gang-header'
import { MatchCardSkeleton, LeaderboardRowSkeleton } from '@/components/ui/skeleton'
import { PendingRequests } from '@/components/gangs/pending-requests'
import { MemberListSection } from '@/components/gangs/member-list-section'
import { LeaveGangButton } from '@/components/gangs/leave-gang-button'
import { UpcomingMatches } from '@/components/matches/upcoming-matches'
import { LiveMatchesSection } from '@/components/matches/live-matches-section'
import { getLiveFixtures } from '@/lib/dal/fixtures'

interface GangPageProps {
  params: Promise<{ groupId: string }>
}

// Deduplicate DAL call between generateMetadata and page render
const getCachedGangDetails = cache(getGangDetails)

/**
 * Dynamic metadata — sets page title to the gang name.
 */
export async function generateMetadata({
  params,
}: GangPageProps): Promise<Metadata> {
  const { groupId } = await params
  const gang = await getCachedGangDetails(groupId)

  return {
    title: gang ? gang.name : 'Gang',
    description: gang
      ? `${gang.name} on Bragg — predict IPL matches and compete with your crew`
      : 'Gang page on Bragg',
  }
}

/**
 * Gang page — the central hub for a gang.
 *
 * Server Component that fetches gang details and composes the
 * GangHeader + sections. Future stories (MTCH-001 through MTCH-003)
 * will replace the remaining match placeholders.
 *
 * Auth gate: unauthenticated users redirect to /login.
 * Membership gate: non-approved members redirect to /dashboard.
 * 404: gang not found or soft-deleted.
 *
 * @see docs/stories/GANG-001-gang-page-header.md
 */
export default async function GangPage({ params }: GangPageProps) {
  const { groupId } = await params
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth gate
  if (!user) {
    redirect('/login')
  }

  // Fetch gang details
  const gang = await getCachedGangDetails(groupId)

  // 404 if not found or deleted
  if (!gang) {
    notFound()
  }

  // Membership gate — check the user is an approved member
  const membership = gang.members.find((m) => m.userId === user.id)
  if (!membership || membership.status !== 'approved') {
    redirect('/dashboard')
  }

  const isAdmin = membership.role === 'admin'

  // Fetch live fixtures for the LiveMatchesSection (client component)
  const liveFixtures = await getLiveFixtures(groupId)

  // Get current user's display name for share text
  const currentUserDisplayName = membership.displayName ?? 'Someone'

  // Construct invite URL on the server
  const inviteUrl = `${env.NEXT_PUBLIC_APP_URL}/join/${gang.inviteCode}`

  return (
    <PageWrapper className="py-8">
      <GangHeader
        gang={gang}
        isAdmin={isAdmin}
        inviteUrl={inviteUrl}
        inviterName={currentUserDisplayName}
      />

      {/* Pending Requests (admin only) — GANG-002 */}
      {isAdmin && (
        <Suspense fallback={null}>
          <PendingRequests gangId={gang.id} />
        </Suspense>
      )}

      {/* Upcoming Matches — MTCH-001 */}
      <Suspense fallback={<MatchListSkeleton />}>
        <UpcomingMatches
          gangId={gang.id}
          totalMembers={gang.members.filter((m) => m.status === 'approved').length}
        />
      </Suspense>

      {/* Live Matches — MTCH-002 */}
      <LiveMatchesSection
        gangId={gang.id}
        initialLiveFixtures={liveFixtures}
      />

      {/* Placeholder: Recent Results — MTCH-003 */}
      <Suspense fallback={<MatchListSkeleton count={3} />}>
        <section
          className="mt-8"
          aria-label="Recent results"
          data-placeholder="recent-results"
        />
      </Suspense>

      {/* Member List — GANG-003 */}
      <Suspense fallback={<MemberListSkeleton />}>
        <MemberListSection
          gangId={gang.id}
          members={gang.members}
          currentUserId={user.id}
        />
      </Suspense>

      {/* Leave Gang — GANG-004 */}
      {!isAdmin && (
        <LeaveGangButton gangId={gang.id} gangName={gang.name} />
      )}
    </PageWrapper>
  )
}

// ---------------------------------------------------------------------------
// Skeleton compositions for Suspense fallbacks
// ---------------------------------------------------------------------------

function MatchListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div className="mt-8 flex flex-col gap-4">
      {Array.from({ length: count }, (_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  )
}

function MemberListSkeleton() {
  return (
    <div className="mt-8 flex flex-col">
      {Array.from({ length: 3 }, (_, i) => (
        <LeaderboardRowSkeleton key={i} />
      ))}
    </div>
  )
}
