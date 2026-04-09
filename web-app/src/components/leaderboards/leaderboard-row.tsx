import * as React from 'react'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getAvatarInitials } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

interface LeaderboardRowProps extends React.ComponentProps<'div'> {
  /** Rank position (1-based) */
  rank: number
  /** Player display name */
  displayName: string
  /** Score value */
  score: number
  /** Whether this row represents the current user */
  isCurrentUser?: boolean
  /** Whether the member has left/been removed */
  isDeparted?: boolean
  /** Optional avatar image URL */
  avatar?: string
  /** Optional subtitle (e.g. "14/19 correct") */
  subtitle?: string
}

/* -------------------------------------------------------------------------- */
/* RankBadge                                                                   */
/* -------------------------------------------------------------------------- */

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex min-w-[48px] items-center justify-center bg-sunburst-yellow px-3 py-1 font-display text-2xl font-bold text-text-on-primary">
        #1
      </span>
    )
  }

  const color =
    rank === 2
      ? 'text-text-secondary'
      : rank === 3
        ? 'text-bronze'
        : 'text-text-muted'

  return (
    <span
      className={cn(
        'flex min-w-[48px] items-center justify-center font-display text-2xl font-bold',
        color
      )}
    >
      #{rank}
    </span>
  )
}

/* -------------------------------------------------------------------------- */
/* LeaderboardRow                                                              */
/* -------------------------------------------------------------------------- */

function LeaderboardRow({
  rank,
  displayName,
  score,
  isCurrentUser = false,
  isDeparted = false,
  avatar,
  subtitle,
  className,
  ...props
}: LeaderboardRowProps) {
  return (
    <div
      data-slot="leaderboard-row"
      className={cn(
        'flex h-[72px] items-center gap-3 border-b-2 border-mid-concrete bg-dark-concrete px-3',
        'animate-[rank-reorder] duration-[var(--duration-rank)] ease-[var(--ease-spring)]',
        isCurrentUser && 'border-l-4 border-l-bragg-lime bg-lime-wash',
        isDeparted && 'opacity-60',
        className
      )}
      aria-label={`Rank ${rank}: ${displayName}, ${score} points${isCurrentUser ? ' (you)' : ''}${isDeparted ? ' (departed)' : ''}`}
      {...props}
    >
      {/* Rank */}
      <div className={cn(isDeparted && 'opacity-60')}>
        <RankBadge rank={rank} />
      </div>

      {/* Avatar + Name */}
      <div className="flex flex-1 items-center gap-3 overflow-hidden">
        <Avatar size="default">
          {avatar && <AvatarImage src={avatar} alt={displayName} />}
          <AvatarFallback
            className={cn(isDeparted && 'bg-text-muted')}
          >
            {getAvatarInitials(displayName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-col">
          <span
            className={cn(
              'truncate font-body text-base font-medium',
              isDeparted ? 'text-text-muted' : 'text-text-primary'
            )}
          >
            {displayName}
            {isCurrentUser && (
              <span className="ml-1.5 text-body-sm font-normal text-bragg-lime">
                (you)
              </span>
            )}
          </span>
          {subtitle && (
            <span className="truncate text-body-sm text-text-muted">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Score */}
      <span
        className={cn(
          'shrink-0 font-display text-xl font-bold tabular-nums',
          isDeparted ? 'text-text-muted' : 'text-text-primary'
        )}
      >
        {score}
      </span>
    </div>
  )
}

export { LeaderboardRow, RankBadge }
export type { LeaderboardRowProps }
