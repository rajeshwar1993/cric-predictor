import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ScenarioCardProps {
  /** Scenario title (e.g., "Who will win the toss?") */
  title: string
  /** Point value for this scenario (e.g., 10, 15, 20) */
  points: number
  /** Whether the user has picked an answer for this scenario */
  isPicked: boolean
  /**
   * Heading element for the title. Defaults to `h4` (matches the predict
   * page hierarchy where each card sits inside a `ScenarioGroup` h3).
   * Override on surfaces where the parent heading is one level higher
   * (e.g. landing prediction-preview uses `h3` to bridge an h2).
   */
  titleAs?: 'h3' | 'h4'
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
 * When the user has selected an answer, a lime left accent and wash background
 * appear as visual confirmation.
 *
 * @see docs/stories/PRED-001-predict-page.md
 */
export function ScenarioCard({
  title,
  points,
  isPicked,
  titleAs: TitleTag = 'h4',
  children,
}: ScenarioCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-dark-concrete p-4 transition-all duration-[var(--duration-state)] ease-out',
        isPicked
          ? 'border-bragg-lime/30 border-l-4 border-l-bragg-lime bg-lime-wash'
          : 'border-wire',
      )}
    >
      {/* Header: Title + Points badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <TitleTag className="font-body text-h4 font-semibold text-text-primary">
            {title}
          </TitleTag>
        </div>

        {/* Points badge — stat-block style */}
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-bragg-lime px-2.5 py-1 font-display text-caption font-bold uppercase tracking-[0.1em] text-text-on-primary"
          aria-label={`${points} points`}
        >
          {points} PTS
        </span>
      </div>

      {/* Picker area */}
      {children && <div className="mt-3">{children}</div>}

      {/* Picked indicator */}
      {isPicked && (
        <div className="mt-3 flex items-center gap-1.5 text-bragg-lime motion-safe:animate-pop-in">
          <Check className="size-3.5" aria-hidden="true" />
          <span className="text-caption font-medium uppercase tracking-[0.1em]">
            Picked
          </span>
        </div>
      )}
    </div>
  )
}
