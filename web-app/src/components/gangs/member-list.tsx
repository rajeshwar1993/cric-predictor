import { LeaderboardRow } from '@/components/leaderboards/leaderboard-row'
import type { GangDetailMember } from '@/lib/dal/gangs'
import type { GangStandingEntry } from '@/lib/dal/leaderboards'
import type { MemberStatus } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemberListProps {
  /** All gang members (from getGangDetails) */
  members: GangDetailMember[]
  /** Season standings data (from getGangSeasonStandings), may be empty */
  standings: GangStandingEntry[]
  /** The current authenticated user's ID */
  currentUserId: string
}

/**
 * Merged member entry used for rendering.
 */
interface MergedMember {
  userId: string
  displayName: string
  avatarUrl: string | null
  role: string
  status: MemberStatus
  totalPoints: number
  matchesPredicted: number
  accuracyPct: number
  rank: number | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isDepartedStatus(status: MemberStatus): boolean {
  return status === 'left' || status === 'removed'
}

/**
 * Build a subtitle string from standings data.
 * e.g. "14 matches, 85.5% accuracy"
 */
function buildSubtitle(matchesPredicted: number, accuracyPct: number): string {
  if (matchesPredicted === 0) return 'No predictions yet'
  const matchWord = matchesPredicted === 1 ? 'match' : 'matches'
  return `${matchesPredicted} ${matchWord}, ${accuracyPct}% accuracy`
}

// ---------------------------------------------------------------------------
// AdminBadge
// ---------------------------------------------------------------------------

function AdminBadge() {
  return (
    <span className="inline-flex items-center rounded-sm bg-bragg-lime px-3 py-1.5 font-body text-[11px] font-bold uppercase leading-tight tracking-widest text-text-on-primary">
      Admin
    </span>
  )
}

// ---------------------------------------------------------------------------
// MemberList (Server Component)
// ---------------------------------------------------------------------------

/**
 * MemberList — displays all gang members ranked by season standings.
 *
 * Server Component that merges member data with standings and renders
 * LeaderboardRow entries. Active ranked members first, unranked second,
 * departed members last.
 *
 * @see docs/stories/GANG-003-member-list.md
 */
export function MemberList({
  members,
  standings,
  currentUserId,
}: MemberListProps) {
  // Build a standings lookup by user_id
  const standingsMap = new Map<string, GangStandingEntry>()
  for (const entry of standings) {
    standingsMap.set(entry.userId, entry)
  }

  // Merge members with standings
  const merged: MergedMember[] = members
    .filter((m) => m.status !== 'pending' && m.status !== 'rejected')
    .map((m) => {
      const standing = standingsMap.get(m.userId)
      return {
        userId: m.userId,
        displayName: m.displayName ?? m.email,
        avatarUrl: standing?.avatarUrl ?? null,
        role: m.role,
        status: m.status,
        totalPoints: standing?.totalPoints ?? 0,
        matchesPredicted: standing?.matchesPredicted ?? 0,
        accuracyPct: standing?.accuracyPct ?? 0,
        rank: standing?.rank ?? null,
      }
    })

  // Sort: active ranked first (by rank ASC), active unranked second, departed last
  const sorted = merged.sort((a, b) => {
    const aDeparted = isDepartedStatus(a.status) ? 1 : 0
    const bDeparted = isDepartedStatus(b.status) ? 1 : 0

    // Departed always at bottom
    if (aDeparted !== bDeparted) return aDeparted - bDeparted

    // Among active: ranked before unranked
    const aRanked = a.rank !== null ? 0 : 1
    const bRanked = b.rank !== null ? 0 : 1
    if (aRanked !== bRanked) return aRanked - bRanked

    // Both ranked: by rank ascending
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank

    // Both unranked: alphabetical by name
    return a.displayName.localeCompare(b.displayName)
  })

  return (
    <section className="mt-8" aria-label="Members">
      <h2 className="mb-3 font-body text-caption font-medium uppercase tracking-widest text-text-muted">
        Members
      </h2>
      <div className="flex flex-col" role="list">
        {sorted.map((member) => {
          const departed = isDepartedStatus(member.status)
          const isCurrentUser = member.userId === currentUserId
          const isAdmin = member.role === 'admin'
          // Show actual rank; null renders as "—" in LeaderboardRow
          const displayRank = member.rank

          return (
            <LeaderboardRow
              key={member.userId}
              role="listitem"
              rank={displayRank}
              displayName={member.displayName}
              score={member.totalPoints}
              isCurrentUser={isCurrentUser}
              isDeparted={departed}
              avatar={member.avatarUrl ?? undefined}
              subtitle={buildSubtitle(
                member.matchesPredicted,
                member.accuracyPct,
              )}
              badge={isAdmin ? <AdminBadge /> : undefined}
            />
          )
        })}
      </div>
    </section>
  )
}
