import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BatsmenInfoProps {
  /** Name of the striker (on-strike batsman) */
  strikerName: string | null
  /** Score of the striker, e.g. "45(32)" */
  strikerScore: string | null
  /** Name of the non-striker */
  nonStrikerName: string | null
  /** Score of the non-striker, e.g. "23(18)" */
  nonStrikerScore: string | null
  /** Optional additional CSS classes */
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * BatsmenInfo — displays the current batsmen at the crease with
 * an on-strike indicator for the striker.
 *
 * @see docs/stories/MTCH-002-live-scorecard.md
 */
export function BatsmenInfo({
  strikerName,
  strikerScore,
  nonStrikerName,
  nonStrikerScore,
  className,
}: BatsmenInfoProps) {
  // Don't render if no batsman data
  if (!strikerName && !nonStrikerName) return null

  return (
    <div
      className={cn('flex flex-col gap-1', className)}
      aria-label="Current batsmen"
    >
      {strikerName && (
        <BatsmanRow
          name={strikerName}
          score={strikerScore}
          isOnStrike
        />
      )}
      {nonStrikerName && (
        <BatsmanRow
          name={nonStrikerName}
          score={nonStrikerScore}
          isOnStrike={false}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-component
// ---------------------------------------------------------------------------

function BatsmanRow({
  name,
  score,
  isOnStrike,
}: {
  name: string
  score: string | null
  isOnStrike: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-body-sm">
      {/* On-strike indicator dot */}
      <span
        className={cn(
          'inline-block size-1.5 rounded-full',
          isOnStrike ? 'bg-bragg-lime' : 'bg-transparent',
        )}
        aria-hidden="true"
      />
      <span className={cn('text-text-primary', isOnStrike && 'font-semibold')}>
        {name}
      </span>
      {score && (
        <span className="font-display text-text-secondary tabular-nums">
          {score}
        </span>
      )}
      {isOnStrike && (
        <span className="sr-only">(on strike)</span>
      )}
    </div>
  )
}
