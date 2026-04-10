import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarInitials } from '@/lib/utils'
import type { MatchPredictionMember } from '@/lib/dal/predictions-shared'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEPARTED_STATUSES = new Set(['left', 'removed'])

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PredictionRevealHeaderProps {
  /** Members in leaderboard rank order. */
  members: MatchPredictionMember[]
  /** The current authenticated user's ID (for highlighting their column). */
  currentUserId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a short name for the member column header.
 * Uses the first word of the display name (e.g., "Alice" from "Alice Johnson").
 */
function shortName(displayName: string | null): string {
  if (!displayName) return 'Unknown'
  const words = displayName.trim().split(/\s+/)
  return words[0] ?? displayName
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PredictionRevealHeader — renders the `<thead>` row with one column per
 * member plus the sticky "SCENARIO" column and trailing "ANSWER" column.
 *
 * The current user's column gets the bragg-lime background to match the
 * match leaderboard highlighting pattern.
 *
 * @see docs/stories/LDB-002-prediction-reveal.md
 */
export function PredictionRevealHeader({
  members,
  currentUserId,
}: PredictionRevealHeaderProps) {
  return (
    <thead>
      <tr className="border-b-2 border-mid-concrete">
        {/* Sticky first column — scenario title + points */}
        <th
          scope="col"
          className={cn(
            'sticky left-0 z-10 bg-dark-concrete',
            'px-3 py-3 text-left font-display text-caption font-bold uppercase text-text-secondary',
            'min-w-[180px]',
          )}
        >
          Scenario
        </th>

        {/* One column per member */}
        {members.map((member) => {
          const isCurrentUser = member.userId === currentUserId
          const isDeparted = DEPARTED_STATUSES.has(member.memberStatus)

          return (
            <th
              key={member.userId}
              scope="col"
              className={cn(
                'px-3 py-3 text-center font-display text-caption font-bold uppercase',
                isCurrentUser
                  ? 'bg-bragg-lime text-text-on-primary'
                  : 'text-text-secondary',
                isDeparted && !isCurrentUser && 'opacity-75',
                'min-w-[72px]',
              )}
            >
              <div className="flex flex-col items-center gap-1">
                <Avatar size="sm">
                  {member.avatarUrl && (
                    <AvatarImage
                      src={member.avatarUrl}
                      alt={member.displayName ?? 'Member'}
                    />
                  )}
                  <AvatarFallback>
                    {getAvatarInitials(member.displayName ?? '?')}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[64px]">
                  {isCurrentUser ? 'YOU' : shortName(member.displayName)}
                </span>
              </div>
            </th>
          )
        })}

        {/* Trailing answer column */}
        <th
          scope="col"
          className="px-3 py-3 text-center font-display text-caption font-bold uppercase text-text-secondary min-w-[80px]"
        >
          Answer
        </th>
      </tr>
    </thead>
  )
}
