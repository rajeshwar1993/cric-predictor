import { Check, Circle } from 'lucide-react'
import { getMembersWhoPredictedForFixture } from '@/lib/dal/predictions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MemberPredictionStatus {
  userId: string
  displayName: string
  hasPredicted: boolean
}

interface PredictionStatusIndicatorProps {
  gangId: string
  fixtureId: string
  members: Array<{
    userId: string
    displayName: string
  }>
  /** Whether the prediction window is open and pre-deadline */
  isVisible: boolean
}

// ---------------------------------------------------------------------------
// Component (Server)
// ---------------------------------------------------------------------------

export async function PredictionStatusIndicator({
  gangId,
  fixtureId,
  members,
  isVisible,
}: PredictionStatusIndicatorProps) {
  if (!isVisible) return null
  if (members.length === 0) return null

  const predictedUserIds = await getMembersWhoPredictedForFixture(gangId, fixtureId)
  const predictedSet = new Set(predictedUserIds)

  // Build status list
  const statuses: MemberPredictionStatus[] = members.map((m) => ({
    userId: m.userId,
    displayName: m.displayName,
    hasPredicted: predictedSet.has(m.userId),
  }))

  // Sort: predicted first, then alphabetical within each group
  statuses.sort((a, b) => {
    if (a.hasPredicted !== b.hasPredicted) {
      return a.hasPredicted ? -1 : 1
    }
    return a.displayName.localeCompare(b.displayName)
  })

  const predictedCount = statuses.filter((s) => s.hasPredicted).length

  return (
    <div className="flex flex-col gap-[var(--sp-2)]" aria-label="Prediction status">
      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
        {String(predictedCount)}/{String(members.length)} predicted
      </p>
      <div className="flex flex-wrap gap-[var(--sp-2)]">
        {statuses.map((status) => (
          <PredictionChip key={status.userId} status={status} />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Avatar Chip (sub-component)
// ---------------------------------------------------------------------------

function PredictionChip({ status }: { status: MemberPredictionStatus }) {
  const initial = status.displayName.charAt(0).toUpperCase()

  return (
    <div
      className="inline-flex items-center gap-[var(--sp-1)] rounded-[var(--radius-ds-full)] px-[var(--sp-2)] py-[2px]"
      style={{ backgroundColor: 'var(--bg-overlay)' }}
      title={
        status.hasPredicted
          ? `${status.displayName} has predicted`
          : `${status.displayName} hasn't predicted`
      }
    >
      {/* Avatar circle */}
      <span
        className="flex h-5 w-5 items-center justify-center rounded-[var(--radius-ds-full)] text-[10px] font-semibold"
        style={{
          backgroundColor: status.hasPredicted ? 'var(--success-muted)' : 'var(--bg-inset)',
          color: status.hasPredicted ? 'var(--success)' : 'var(--text-tertiary)',
          border: `1px solid ${status.hasPredicted ? 'var(--success)' : 'var(--border-default)'}`,
        }}
        aria-hidden="true"
      >
        {initial}
      </span>

      {/* Status icon */}
      {status.hasPredicted ? (
        <Check size={12} strokeWidth={2} style={{ color: 'var(--success)' }} aria-hidden="true" />
      ) : (
        <Circle
          size={8}
          strokeWidth={2}
          style={{ color: 'var(--text-tertiary)' }}
          aria-hidden="true"
        />
      )}

      {/* Name */}
      <span
        className="max-w-[80px] truncate text-xs font-medium"
        style={{ color: status.hasPredicted ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
      >
        {status.displayName}
      </span>

      {/* Screen reader text */}
      <span className="sr-only">
        {status.displayName} {status.hasPredicted ? 'has predicted' : 'has not predicted'}
      </span>
    </div>
  )
}
