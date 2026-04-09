import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface Last6BallsProps {
  /** Space-separated string of ball outcomes, e.g. "1 4 W 0 6 2" */
  balls: string
  /** Optional additional CSS classes */
  className?: string
}

// ---------------------------------------------------------------------------
// Ball color mapping
// ---------------------------------------------------------------------------

/**
 * Returns Tailwind classes for a ball pill based on outcome.
 *
 * Color mapping per design spec:
 * - "W" (wicket): electric-coral bg, white text
 * - "4" (four): vivid-blue bg, white text
 * - "6" (six): bragg-lime bg, black text
 * - "0" (dot): wire bg, muted text
 * - others: dark-concrete bg, white text
 */
function getBallClasses(ball: string): string {
  switch (ball) {
    case 'W':
      return 'bg-electric-coral text-text-primary'
    case '4':
      return 'bg-vivid-blue text-text-primary'
    case '6':
      return 'bg-bragg-lime text-text-on-primary'
    case '0':
      return 'bg-wire text-text-muted'
    default:
      return 'bg-dark-concrete text-text-primary'
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Last6Balls — renders the last 6 ball outcomes as colored pills.
 *
 * Parses a space-separated string like "1 4 W 0 6 2" and displays
 * each ball as a colored circular pill according to the design system.
 *
 * @see docs/stories/MTCH-002-live-scorecard.md
 */
export function Last6Balls({ balls, className }: Last6BallsProps) {
  const ballArray = balls.trim().split(/\s+/).filter(Boolean)

  if (ballArray.length === 0) return null

  return (
    <div
      className={cn('flex items-center gap-1.5', className)}
      aria-label={`Last ${ballArray.length} balls: ${balls}`}
    >
      {ballArray.map((ball, index) => (
        <span
          key={`${ball}-${index}`}
          className={cn(
            'flex size-7 items-center justify-center rounded-full text-xs font-bold',
            getBallClasses(ball),
          )}
          aria-label={getBallLabel(ball)}
        >
          {ball}
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBallLabel(ball: string): string {
  switch (ball) {
    case 'W':
      return 'Wicket'
    case '0':
      return 'Dot ball'
    case '4':
      return 'Four'
    case '6':
      return 'Six'
    default:
      return `${ball} run${ball === '1' ? '' : 's'}`
  }
}
