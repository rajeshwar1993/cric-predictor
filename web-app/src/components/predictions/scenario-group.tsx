import type { ResolutionPhase } from '@/types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ScenarioGroupProps {
  /** The resolution phase key */
  phase: ResolutionPhase
  /** Human-readable phase label (e.g., "TOSS", "MATCH END") */
  label: string
  /** Scenario card elements to render within this group */
  children: React.ReactNode
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ScenarioGroup — groups scenario cards under a resolution phase heading.
 *
 * Renders a phase heading with a lime left accent bar and wraps
 * the child scenario cards in a vertical stack.
 *
 * Phase groups are rendered in canonical order by the parent page.
 *
 * @see docs/stories/PRED-001-predict-page.md
 */
export function ScenarioGroup({ phase, label, children }: ScenarioGroupProps) {
  return (
    <section aria-labelledby={`phase-${phase}`} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="h-7 w-1 rounded-full bg-bragg-lime" aria-hidden="true" />
        <h3
          id={`phase-${phase}`}
          className="font-display text-h2 font-bold uppercase tracking-[-0.02em] text-text-primary"
        >
          {label}
        </h3>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}
