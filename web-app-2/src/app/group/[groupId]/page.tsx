import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { BarChart3, Settings, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getGangDetails, getPendingRequests } from '@/lib/actions/dal-gangs'
import { getMemberListWithPoints, getActiveSeason } from '@/lib/actions/dal-leaderboards'
import { UpcomingMatchesSection } from '@/components/matches/upcoming-matches-section'
import { LiveMatchesSection } from '@/components/matches/live-matches-section'
import { RecentResultsSection } from '@/components/matches/recent-results-section'
import { InviteShare } from '@/components/gangs/invite-share'
import { PendingRequests } from '@/components/gangs/pending-requests'
import { MemberList } from '@/components/gangs/member-list'
import { LeaveGangButton } from '@/components/gangs/leave-gang-button'

interface GroupPageProps {
  params: Promise<{ groupId: string }>
}

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { groupId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    return { title: 'Gang | Bragg' }
  }

  const gang = await getGangDetails(groupId, user.id)
  if (gang === null) {
    return { title: 'Gang | Bragg' }
  }

  return { title: `${gang.name} | Bragg` }
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { groupId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user === null) {
    redirect('/login')
  }

  const gang = await getGangDetails(groupId, user.id)

  if (gang === null) {
    notFound()
  }

  // Verify the user is an approved member
  if (gang.currentUserRole === null) {
    redirect('/dashboard')
  }

  const isAdmin = gang.currentUserRole === 'admin'

  // Fetch pending requests for admin
  const pendingRequests = isAdmin ? await getPendingRequests(groupId) : []

  // Fetch season standings for member list with real points
  const activeSeason = await getActiveSeason()
  const membersWithPoints =
    activeSeason !== null ? await getMemberListWithPoints(groupId, activeSeason.id) : []

  // Build member list with real points
  const enrichedMembers = gang.members.map((m) => {
    const withPoints = membersWithPoints.find((mp) => mp.userId === m.userId)
    return {
      ...m,
      points: withPoints?.totalPoints ?? 0,
      rank: withPoints?.rank ?? null,
    }
  })

  return (
    <div className="flex flex-col gap-[var(--sp-6)]">
      {/* Gang header */}
      <header>
        <h1 className="font-heading text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {gang.name}
        </h1>
        <div
          className="mt-[var(--sp-1)] flex items-center gap-[var(--sp-1)] text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Users size={16} strokeWidth={1.5} aria-hidden="true" />
          <span>{gang.memberCount}/20 members</span>
        </div>
      </header>

      {/* Invite share */}
      <section aria-label="Invite friends">
        <h2
          className="mb-[var(--sp-3)] font-heading text-lg font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Invite Friends
        </h2>
        <InviteShare inviteCode={gang.inviteCode} gangName={gang.name} />
      </section>

      {/* Admin: Settings link */}
      {isAdmin && (
        <Link
          href={`/group/${groupId}/settings`}
          className="flex items-center gap-[var(--sp-2)] rounded-[length:var(--radius-ds-md)] border border-[var(--border-default)] bg-[var(--bg-raised)] px-[var(--sp-4)] py-[var(--sp-3)] text-sm font-medium transition-colors hover:border-[var(--border-strong)] focus-visible:border-[var(--border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--brand-muted)] focus-visible:outline-none"
          style={{ color: 'var(--text-primary)' }}
        >
          <Settings size={20} strokeWidth={1.5} aria-hidden="true" />
          Gang Settings
        </Link>
      )}

      {/* Admin: Pending requests */}
      {isAdmin && pendingRequests.length > 0 && (
        <PendingRequests gangId={groupId} requests={pendingRequests} />
      )}

      {/* Upcoming matches */}
      <UpcomingMatchesSection
        gangId={groupId}
        members={gang.members.map((m) => ({
          userId: m.userId,
          displayName: m.displayName,
        }))}
      />

      {/* Live matches (hidden when none) */}
      <LiveMatchesSection gangId={groupId} />

      {/* Recent results (hidden when none) */}
      <RecentResultsSection gangId={groupId} userId={user.id} />

      {/* Standings link */}
      <Link
        href={`/group/${groupId}/standings`}
        className="flex items-center gap-[var(--sp-2)] rounded-[length:var(--radius-ds-md)] border border-[var(--border-default)] bg-[var(--bg-raised)] px-[var(--sp-4)] py-[var(--sp-3)] text-sm font-medium transition-colors hover:border-[var(--border-strong)] focus-visible:border-[var(--border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--brand-muted)] focus-visible:outline-none"
        style={{ color: 'var(--text-primary)' }}
      >
        <BarChart3 size={20} strokeWidth={1.5} aria-hidden="true" />
        Season Standings
      </Link>

      {/* Member list */}
      <section aria-label="Gang members">
        <h2
          className="mb-[var(--sp-3)] font-heading text-lg font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Members{' '}
          <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
            ({gang.memberCount})
          </span>
        </h2>
        <div className="overflow-hidden rounded-[length:var(--radius-ds-lg)] border border-[var(--border-default)] bg-[var(--bg-raised)]">
          <MemberList members={enrichedMembers} />
        </div>
      </section>

      {/* Non-admin: Leave gang */}
      {!isAdmin && (
        <section aria-label="Leave gang">
          <LeaveGangButton gangId={groupId} gangName={gang.name} />
        </section>
      )}
    </div>
  )
}
