import { Trophy } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchLeaderboardEntry {
  userId: string
  displayName: string
  rank: number
  predictedCount: number
  resolvedCount: number
  correctCount: number
  pointsEarned: number
  memberStatus: 'approved' | 'left' | 'removed'
}

interface MatchLeaderboardTableProps {
  entries: MatchLeaderboardEntry[]
  currentUserId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitial(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length === 0) return '?'
  return (trimmed[0] ?? '?').toUpperCase()
}

function getRankColor(rank: number): string {
  if (rank === 1) return 'var(--rank-gold)'
  if (rank === 2) return 'var(--rank-silver)'
  if (rank === 3) return 'var(--rank-bronze)'
  return 'var(--text-secondary)'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MatchLeaderboardTable({ entries, currentUserId }: MatchLeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Trophy size={32} strokeWidth={1.5} />}
        title="Nobody's made a call yet"
        description="Be the first one in!"
      />
    )
  }

  // Sort: active members first (by rank), then left/removed at bottom
  const sorted = [...entries].sort((a, b) => {
    const aInactive = a.memberStatus !== 'approved' ? 1 : 0
    const bInactive = b.memberStatus !== 'approved' ? 1 : 0
    if (aInactive !== bInactive) return aInactive - bInactive
    return a.rank - b.rank
  })

  return (
    <div className="overflow-hidden rounded-[var(--radius-ds-lg)] border border-[var(--border-default)]">
      {/* Header */}
      <div className="hidden items-center gap-[var(--sp-3)] border-b border-[var(--border-default)] px-[var(--sp-4)] py-[var(--sp-2)] text-xs font-medium uppercase tracking-[0.05em] sm:flex bg-[var(--bg-overlay)] text-[var(--text-tertiary)]">
        <span className="w-8 shrink-0 text-right">#</span>
        <span className="flex-1">Name</span>
        <span className="hidden w-16 shrink-0 text-right sm:block">Correct</span>
        <span className="hidden w-16 shrink-0 text-right sm:block">Picked</span>
        <span className="w-16 shrink-0 text-right">Points</span>
      </div>

      {/* Rows */}
      <ul className="flex flex-col" role="list" aria-label="Match leaderboard">
        {sorted.map((entry) => {
          const isCurrentUser = entry.userId === currentUserId
          const isInactive = entry.memberStatus !== 'approved'

          return (
            <li
              key={entry.userId}
              className={cn(
                'flex items-center gap-[var(--sp-3)] border-b border-[var(--border-default)] px-[var(--sp-4)] py-[var(--sp-3)]',
                isCurrentUser && 'border-l-[3px] border-l-[var(--brand)] bg-[var(--brand-muted)]',
                isInactive && 'opacity-50',
              )}
              style={{
                minHeight: 56,
                backgroundColor:
                  isCurrentUser && !isInactive ? 'var(--brand-muted)' : 'var(--bg-raised)',
              }}
              aria-label={`Rank ${String(entry.rank)}: ${entry.displayName}${isCurrentUser ? ' (you)' : ''} — ${String(entry.pointsEarned)} points`}
            >
              {/* Rank */}
              <span
                className="w-8 shrink-0 text-right text-lg font-bold tabular-nums"
                style={{
                  color: getRankColor(entry.rank),
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {entry.rank}
              </span>

              {/* Avatar */}
              <Avatar size="sm">
                <AvatarFallback>{getInitial(entry.displayName)}</AvatarFallback>
              </Avatar>

              {/* Name */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-[var(--sp-1)]">
                  <span className="truncate text-base font-medium text-[var(--text-primary)]">
                    {entry.displayName}
                  </span>
                  {isCurrentUser && (
                    <span className="shrink-0 text-xs text-[var(--text-secondary)]">(you)</span>
                  )}
                </div>
                {isInactive && (
                  <span className="text-xs uppercase tracking-wider text-[var(--text-tertiary)]">
                    {entry.memberStatus}
                  </span>
                )}
              </div>

              {/* Correct / Resolved — hidden on mobile */}
              <span
                className="hidden w-16 shrink-0 text-right text-sm tabular-nums sm:block text-[var(--text-secondary)]"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {entry.correctCount}/{entry.resolvedCount}
              </span>

              {/* Predicted — hidden on mobile */}
              <span
                className="hidden w-16 shrink-0 text-right text-sm tabular-nums sm:block text-[var(--text-secondary)]"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {entry.predictedCount}
              </span>

              {/* Points — always visible */}
              <span
                className="shrink-0 text-lg font-bold tabular-nums text-[var(--brand)]"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {entry.pointsEarned}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
