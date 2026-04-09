import { getGangActiveSeason, getGangSeasonStandings } from '@/lib/dal/leaderboards'
import type { GangDetailMember } from '@/lib/dal/gangs'
import { MemberList } from '@/components/gangs/member-list'

export interface MemberListSectionProps {
  /** The gang ID to fetch standings for */
  gangId: string
  /** All gang members (from getGangDetails) */
  members: GangDetailMember[]
  /** The current authenticated user's ID */
  currentUserId: string
}

/**
 * MemberListSection — async Server Component that fetches season standings
 * and renders the MemberList presentational component.
 *
 * Wrapped in Suspense by the page for loading state.
 *
 * @see docs/stories/GANG-003-member-list.md
 */
export async function MemberListSection({
  gangId,
  members,
  currentUserId,
}: MemberListSectionProps) {
  // Resolve the active season for this gang
  const activeSeason = await getGangActiveSeason(gangId)

  // Fetch standings if we have an active season
  const standings = activeSeason
    ? await getGangSeasonStandings(gangId, activeSeason.seasonId)
    : []

  return (
    <MemberList
      members={members}
      standings={standings}
      currentUserId={currentUserId}
    />
  )
}
