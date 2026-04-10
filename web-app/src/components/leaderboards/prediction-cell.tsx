import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PredictionCellProps {
  /** Raw stored prediction value (null when member didn't predict). */
  value: string | null
  /** Pre-resolved human-readable display (e.g. "MI", "Rohit Sharma", "160-179"). */
  displayValue: string | null
  /** Whether the prediction was correct (null until the scenario is resolved). */
  isCorrect: boolean | null
  /** True once the scenario has been scored. */
  isResolved: boolean
  /** True when the scenario has been voided — no winners, no losers. */
  isVoided: boolean
  /** Accessible label describing the cell state (e.g. "Alice predicted MI, correct"). */
  ariaLabel: string
  /** True when the column belongs to the current authenticated user. */
  isCurrentUser?: boolean
  /** Optional class for layout tweaks (e.g. width). */
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PredictionCell — one cell in the prediction reveal matrix.
 *
 * Visual states (listed in precedence order):
 *   1. Voided                     → "VOIDED" label, muted text, no indicator.
 *   2. Not predicted              → dash, muted text.
 *   3. Not resolved OR still      → raw display value, neutral secondary text.
 *      awaiting score
 *      (isResolved=false, or
 *       isResolved=true but
 *       isCorrect=null — the
 *       transient window while
 *       the resolution cron is
 *       still writing per-user
 *       scores).
 *   4. Resolved + correct         → lime wash background, lime text, "✓".
 *   5. Resolved + incorrect       → coral wash background, coral text, "✗".
 *
 * Always rendered as a `<td>` so it plugs into a semantic `<table>`.
 *
 * @see docs/stories/LDB-002-prediction-reveal.md
 */
export function PredictionCell({
  value,
  displayValue,
  isCorrect,
  isResolved,
  isVoided,
  ariaLabel,
  isCurrentUser = false,
  className,
}: PredictionCellProps) {
  // State 1: voided (takes precedence — no scoring)
  if (isVoided) {
    return (
      <td
        aria-label={ariaLabel}
        className={cn(
          'text-center align-middle font-body text-body-sm text-text-muted',
          'px-3 py-2',
          isCurrentUser && 'bg-lime-wash',
          className,
        )}
      >
        VOIDED
      </td>
    )
  }

  // State 2: not predicted
  if (value === null || value === '') {
    return (
      <td
        aria-label={ariaLabel}
        className={cn(
          'text-center align-middle font-body text-body-sm text-text-muted',
          'px-3 py-2',
          isCurrentUser && 'bg-lime-wash',
          className,
        )}
      >
        —
      </td>
    )
  }

  // State 3: predicted but not yet scored — neutral.
  //
  // Treat `isCorrect === null` as "not yet scored" even if `isResolved` is
  // true. The scenario row can flip to resolved before the per-user scoring
  // pass writes `is_correct` for every prediction (a transient window inside
  // the resolution cron). Rendering those cells as "incorrect" would flash a
  // red ✗ on a pick that may well be right.
  if (!isResolved || isCorrect === null) {
    return (
      <td
        aria-label={ariaLabel}
        className={cn(
          'text-center align-middle font-body text-body-sm text-text-secondary',
          'px-3 py-2',
          isCurrentUser && 'bg-lime-wash',
          className,
        )}
      >
        {displayValue ?? value}
      </td>
    )
  }

  // State 4 / 5: resolved with a definitive correct/incorrect.
  const correct = isCorrect === true

  return (
    <td
      aria-label={ariaLabel}
      className={cn(
        'text-center align-middle font-body text-body-sm font-medium',
        'px-3 py-2',
        correct
          ? 'bg-bragg-lime/15 text-bragg-lime'
          : 'bg-electric-coral/15 text-electric-coral',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        <span>{displayValue ?? value}</span>
        <span aria-hidden="true">{correct ? '✓' : '✗'}</span>
      </span>
    </td>
  )
}
