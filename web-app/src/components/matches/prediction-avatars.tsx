import type { PredictedMember } from '@/lib/dal/fixtures'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getAvatarInitials } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PredictionAvatarsProps {
  /** Members who have submitted predictions */
  members: PredictedMember[]
  /** Maximum avatars to show before overflow (default 4) */
  maxVisible?: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PredictionAvatars — renders a horizontal row of overlapping avatar circles
 * for gang members who have predicted on a fixture.
 *
 * Shows initials inside each avatar. When members exceed `maxVisible`,
 * shows a "+N" overflow pill.
 *
 * Returns null when there are no members (empty state).
 */
export function PredictionAvatars({
  members,
  maxVisible = 4,
}: PredictionAvatarsProps) {
  if (members.length === 0) return null

  const visible = members.slice(0, maxVisible)
  const overflowCount = members.length - maxVisible

  return (
    <div
      className="flex -space-x-2"
      aria-label={`${members.length} members predicted: ${visible.map((m) => m.displayName).join(', ')}${overflowCount > 0 ? ` and ${overflowCount} more` : ''}`}
    >
      {visible.map((member) => (
        <Avatar
          key={member.userId}
          size="sm"
          className="ring-2 ring-concrete-black"
          title={member.displayName}
        >
          <AvatarFallback className="bg-mid-concrete text-xs font-bold text-text-secondary">
            {getAvatarInitials(member.displayName)}
          </AvatarFallback>
        </Avatar>
      ))}
      {overflowCount > 0 && (
        <div
          className="flex size-8 items-center justify-center rounded-full bg-mid-concrete text-xs font-bold text-text-secondary ring-2 ring-concrete-black"
          aria-label={`${overflowCount} more members predicted`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  )
}
