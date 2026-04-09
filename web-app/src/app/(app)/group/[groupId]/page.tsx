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
 * GangHeader + placeholder sections. Future stories (GANG-002 through
 * GANG-004, MTCH-001 through MTCH-003) will replace the stubs.
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

      {/* Placeholder: Upcoming Matches — MTCH-001 */}
      <Suspense fallback={<MatchListSkeleton />}>
        <section
          className="mt-8"
          aria-label="Upcoming matches"
          data-placeholder="upcoming-matches"
        />
      </Suspense>

      {/* Placeholder: Live Matches — MTCH-002 */}
      <section
        className="mt-8"
        aria-label="Live matches"
        data-placeholder="live-matches"
      />

      {/* Placeholder: Recent Results — MTCH-003 */}
      <Suspense fallback={<MatchListSkeleton count={3} />}>
        <section
          className="mt-8"
          aria-label="Recent results"
          data-placeholder="recent-results"
        />
      </Suspense>

      {/* Placeholder: Member List — GANG-003 */}
      <Suspense fallback={<MemberListSkeleton />}>
        <section
          className="mt-8"
          aria-label="Members"
          data-placeholder="member-list"
        />
      </Suspense>

      {/* Placeholder: Leave Gang — GANG-004 */}
      {!isAdmin && (
        <section
          className="mt-8"
          aria-label="Leave gang"
          data-placeholder="leave-gang"
        />
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
