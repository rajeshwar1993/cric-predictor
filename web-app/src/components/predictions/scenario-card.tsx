import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ScenarioCardProps {
  /** Scenario title (e.g., "Who will win the toss?") */
  title: string
  /** Optional description text below the title */
  description?: string | null
  /** Point value for this scenario (e.g., 10, 15, 20) */
  pointsWeight: number
  /** Whether the user has picked an answer for this scenario */
  isPicked: boolean
  /** Picker input area — rendered via children (actual pickers from PRED-002) */
  children?: React.ReactNode
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ScenarioCard — displays a single prediction scenario within the predict form.
 *
 * Shows the scenario title, point value badge, and a slot for the input picker.
 * When the user has selected an answer, a lime check indicator appears.
 *
 * This component is a server component (no interactivity). The picker children
 * from PRED-002 will be client components.
 *
 * @see docs/stories/PRED-001-predict-page.md
 */
export function ScenarioCard({
  title,
  description,
  pointsWeight,
  isPicked,
  children,
}: ScenarioCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-dark-concrete p-4 transition-colors duration-[180ms] ease-out',
        isPicked ? 'border-bragg-lime/30' : 'border-wire',
      )}
    >
      {/* Header: Title + Points badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h4 className="font-body text-h4 font-semibold text-text-primary">
            {title}
          </h4>
          {description && (
            <p className="text-body-sm text-text-muted">{description}</p>
          )}
        </div>

        {/* Points badge — stat-block style */}
        <span
          className="inline-flex shrink-0 items-center gap-1 bg-bragg-lime px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-[0.1em] text-text-on-primary"
          aria-label={`${pointsWeight} points`}
        >
          {pointsWeight} PTS
        </span>
      </div>

      {/* Picker area */}
      {children && <div className="mt-3">{children}</div>}

      {/* Picked indicator */}
      {isPicked && (
        <div className="mt-3 flex items-center gap-1.5 text-bragg-lime">
          <Check className="size-3.5" aria-hidden="true" />
          <span className="text-caption font-medium uppercase tracking-[0.1em]">
            Picked
          </span>
        </div>
      )}
    </div>
  )
}
